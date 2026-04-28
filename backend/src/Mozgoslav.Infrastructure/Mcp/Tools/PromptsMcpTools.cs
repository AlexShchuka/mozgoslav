using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Threading;
using System.Threading.Tasks;

using ModelContextProtocol.Server;

using Mozgoslav.Application.Prompts;

namespace Mozgoslav.Infrastructure.Mcp.Tools;

[McpServerToolType]
public sealed class PromptsMcpTools
{
    private readonly IPromptBuilder _promptBuilder;

    public PromptsMcpTools(IPromptBuilder promptBuilder)
    {
        _promptBuilder = promptBuilder;
    }

    [McpServerTool(Name = "prompts.build")]
    [Description("Build a curated context prompt from a template with placeholders. Placeholders like {corpus.query(\"...\")} are resolved in-process.")]
    public async Task<string> BuildAsync(
        [Description("Template markdown string with optional placeholders")] string template,
        [Description("Key-value context to inject into the template")] Dictionary<string, string>? context = null,
        CancellationToken cancellationToken = default)
    {
        IReadOnlyDictionary<string, string> ctx = context
            ?? new Dictionary<string, string>(StringComparer.Ordinal);
        return await _promptBuilder.BuildAsync(template, ctx, cancellationToken);
    }
}
