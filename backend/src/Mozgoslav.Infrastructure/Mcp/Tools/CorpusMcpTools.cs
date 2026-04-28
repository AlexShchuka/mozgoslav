using System.ComponentModel;
using System.Threading;
using System.Threading.Tasks;

using ModelContextProtocol.Server;

using Mozgoslav.Application.Rag;

namespace Mozgoslav.Infrastructure.Mcp.Tools;

[McpServerToolType]
public sealed class CorpusMcpTools
{
    private readonly IRagService _ragService;

    public CorpusMcpTools(IRagService ragService)
    {
        _ragService = ragService;
    }

    [McpServerTool(Name = "corpus.query")]
    [Description("Search the personal notes corpus and get an answer with citations. Use for past conversations, notes, and meeting summaries stored locally.")]
    public async Task<CorpusQueryMcpResult> QueryAsync(
        [Description("The question or search query")] string question,
        [Description("Maximum number of chunks to retrieve (1-20)")] int topK = 5,
        CancellationToken cancellationToken = default)
    {
        var clampedK = topK < 1 ? 1 : topK > 20 ? 20 : topK;
        var answer = await _ragService.AnswerAsync(question, clampedK, cancellationToken);
        var citations = new string[answer.Citations.Count];
        for (var i = 0; i < answer.Citations.Count; i++)
        {
            citations[i] = answer.Citations[i].Chunk.Text;
        }
        return new CorpusQueryMcpResult(answer.Answer, citations);
    }
}

public sealed record CorpusQueryMcpResult(string Answer, string[] Citations);
