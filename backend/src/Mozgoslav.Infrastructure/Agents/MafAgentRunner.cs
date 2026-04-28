using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Agents;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Llm;

namespace Mozgoslav.Infrastructure.Agents;

public sealed class MafAgentRunner : IAgentRunner
{
    private const int MaxToolIterations = 5;

    private readonly ILlmProviderFactory _providerFactory;
    private readonly ILlmCapabilitiesCache _capabilitiesCache;
    private readonly IReadOnlyDictionary<string, IAgentTool> _toolRegistry;
    private readonly ILogger<MafAgentRunner> _logger;

    public MafAgentRunner(
        ILlmProviderFactory providerFactory,
        ILlmCapabilitiesCache capabilitiesCache,
        IReadOnlyList<IAgentTool> tools,
        ILogger<MafAgentRunner> logger)
    {
        _providerFactory = providerFactory;
        _capabilitiesCache = capabilitiesCache;
        _toolRegistry = tools.ToDictionary(t => t.Name, StringComparer.Ordinal);
        _logger = logger;
    }

    public async Task<AgentRunResult> RunAsync(AgentRunRequest request, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentException.ThrowIfNullOrWhiteSpace(request.Prompt);

        var capabilities = _capabilitiesCache.TryGetCurrent();
        if (capabilities is not null && !capabilities.SupportsToolCalling)
        {
            throw new InvalidOperationException(
                "The configured LLM does not support tool-calling. " +
                "Agent loop requires tool-calling capability. " +
                "Switch to a model that supports function-calling (e.g. a 7B+ instruction-tuned model).");
        }

        var availableTools = request.ToolNames.Count > 0
            ? request.ToolNames
                .Where(_toolRegistry.ContainsKey)
                .Select(n => _toolRegistry[n])
                .ToList()
            : [];

        var systemPrompt = BuildSystemPromptWithTools(request.SystemPrompt, availableTools);

        var llmProvider = await _providerFactory.GetCurrentAsync(ct);
        using var chatClient = new LlmProviderChatClientAdapter(llmProvider, systemPrompt, _logger);
        var agent = new ChatClientAgent(chatClient);
        var session = await agent.CreateSessionAsync(conversationId: null!, ct);

        var messages = new[] { new ChatMessage(ChatRole.User, request.Prompt) };
        var options = new AgentRunOptions();

        _logger.LogInformation("Starting MAF agent run for prompt of length {Length}", request.Prompt.Length);

        var toolCallTrace = new List<string>();
        var currentMessages = messages;

        for (var iteration = 0; iteration < MaxToolIterations; iteration++)
        {
            var response = await agent.RunAsync(currentMessages, session, options, ct);

            var assistantText = response.Messages
                .LastOrDefault(m => m.Role == ChatRole.Assistant)?.Text ?? string.Empty;

            var toolCall = TryParseToolCall(assistantText);
            if (toolCall is null || !_toolRegistry.TryGetValue(toolCall.Name, out var tool))
            {
                _logger.LogInformation("MAF agent run completed after {Iterations} iteration(s)", iteration + 1);
                return new AgentRunResult(
                    FinalAnswer: assistantText,
                    ToolCallTrace: toolCallTrace,
                    Citations: [],
                    AgentsEnabled: true);
            }

            string toolResult;
            try
            {
                toolResult = await tool.InvokeAsync(toolCall.ArgsJson, ct);
                toolCallTrace.Add($"{tool.Name}({toolCall.ArgsJson}) => {toolResult}");
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                toolResult = $"error: {ex.Message}";
                toolCallTrace.Add($"{tool.Name}({toolCall.ArgsJson}) => {toolResult}");
            }

            currentMessages = [
                .. currentMessages,
                new ChatMessage(ChatRole.Assistant, assistantText),
                new ChatMessage(ChatRole.User, $"Tool result for {tool.Name}:\n{toolResult}\n\nContinue answering the original question.")
            ];
        }

        _logger.LogInformation("MAF agent run completed after max iterations");
        var finalResponse = await agent.RunAsync(currentMessages, session, options, ct);
        var finalAnswer = finalResponse.Messages
            .LastOrDefault(m => m.Role == ChatRole.Assistant)?.Text ?? string.Empty;

        return new AgentRunResult(
            FinalAnswer: finalAnswer,
            ToolCallTrace: toolCallTrace,
            Citations: [],
            AgentsEnabled: true);
    }

    private static string BuildSystemPromptWithTools(string basePrompt, IReadOnlyList<IAgentTool> tools)
    {
        if (tools.Count == 0)
        {
            return basePrompt;
        }

        var sb = new StringBuilder(basePrompt);
        sb.AppendLine();
        sb.AppendLine();
        sb.AppendLine("Available tools:");
        foreach (var tool in tools)
        {
            sb.AppendLine($"- {tool.Name}: {tool.Description}");
        }
        sb.AppendLine();
        sb.AppendLine("To invoke a tool, respond with exactly:");
        sb.AppendLine("TOOL_CALL: <tool_name> <json_args>");
        sb.AppendLine("Example: TOOL_CALL: corpus.query {\"query\": \"meeting notes\"}");
        sb.AppendLine("After receiving tool results, continue to answer the user question. When done, provide a plain final answer without TOOL_CALL.");
        return sb.ToString();
    }

    private static ToolCallInstruction? TryParseToolCall(string text)
    {
        var match = Regex.Match(
            text,
            @"TOOL_CALL:\s*(\S+)\s+(\{.*\})",
            RegexOptions.Singleline);

        if (!match.Success)
        {
            return null;
        }

        var name = match.Groups[1].Value;
        var argsJson = match.Groups[2].Value;

        try
        {
            using var _ = JsonDocument.Parse(argsJson);
            return new ToolCallInstruction(name, argsJson);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private sealed record ToolCallInstruction(string Name, string ArgsJson);

    private sealed class LlmProviderChatClientAdapter : IChatClient
    {
        private readonly ILlmProvider _provider;
        private readonly string _systemPrompt;
        private readonly ILogger _logger;

        public LlmProviderChatClientAdapter(ILlmProvider provider, string systemPrompt, ILogger logger)
        {
            _provider = provider;
            _systemPrompt = systemPrompt ?? string.Empty;
            _logger = logger;
        }

        public ChatClientMetadata Metadata => new(_provider.Kind, null, null);

        public async Task<ChatResponse> GetResponseAsync(
            IEnumerable<ChatMessage> messages,
            ChatOptions? options = null,
            CancellationToken cancellationToken = default)
        {
            var userPrompt = string.Join("\n", messages.Select(m => m.Text ?? string.Empty));
            try
            {
                var text = await _provider.ChatAsync(_systemPrompt, userPrompt, cancellationToken);
                return new ChatResponse([new ChatMessage(ChatRole.Assistant, text)]);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "LlmProvider.ChatAsync failed inside MafAgentRunner");
                return new ChatResponse([new ChatMessage(ChatRole.Assistant, string.Empty)]);
            }
        }

        public async IAsyncEnumerable<ChatResponseUpdate> GetStreamingResponseAsync(
            IEnumerable<ChatMessage> messages,
            ChatOptions? options = null,
            [EnumeratorCancellation] CancellationToken cancellationToken = default)
        {
            var response = await GetResponseAsync(messages, options, cancellationToken);
            var text = response.Messages.FirstOrDefault()?.Text ?? string.Empty;
            yield return new ChatResponseUpdate(ChatRole.Assistant, text);
        }

        public object? GetService(Type serviceType, object? key = null) => null;

        public void Dispose() { }
    }
}
