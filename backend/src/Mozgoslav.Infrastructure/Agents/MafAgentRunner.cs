using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Agents;
using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Agents;

public sealed class MafAgentRunner : IAgentRunner
{
    private readonly ILlmProviderFactory _providerFactory;
    private readonly ILogger<MafAgentRunner> _logger;

    public MafAgentRunner(ILlmProviderFactory providerFactory, ILogger<MafAgentRunner> logger)
    {
        _providerFactory = providerFactory;
        _logger = logger;
    }

    public async Task<AgentRunResult> RunAsync(AgentRunRequest request, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentException.ThrowIfNullOrWhiteSpace(request.Prompt);

        var llmProvider = await _providerFactory.GetCurrentAsync(ct);
        using var chatClient = new LlmProviderChatClientAdapter(llmProvider, request.SystemPrompt, _logger);
        var agent = new ChatClientAgent(chatClient);
        var session = await agent.CreateSessionAsync(conversationId: null!, ct);

        var messages = new[] { new ChatMessage(ChatRole.User, request.Prompt) };
        var options = new AgentRunOptions();

        _logger.LogInformation("Starting MAF agent run for prompt of length {Length}", request.Prompt.Length);

        var response = await agent.RunAsync(messages, session, options, ct);

        var assistantMessages = response.Messages
            .Where(m => m.Role == ChatRole.Assistant)
            .ToList();

        var finalAnswer = assistantMessages.LastOrDefault()?.Text ?? string.Empty;

        _logger.LogInformation("MAF agent run completed, response messages: {Count}", response.Messages.Count);

        return new AgentRunResult(
            FinalAnswer: finalAnswer,
            ToolCallTrace: [],
            Citations: [],
            AgentsEnabled: true);
    }

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
