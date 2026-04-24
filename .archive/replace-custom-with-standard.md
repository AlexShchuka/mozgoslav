# replace custom code with standard libraries and tools

Audit the repo for hand-rolled primitives that duplicate well-known library capabilities: custom HTTP retry / back-off wrappers, ad-hoc queue implementations, bespoke JSON serialization, custom file locking, hand-rolled SSE parsers, home-grown embedding fallbacks, custom CLI argument handling. For each, switch to the standard library or the established ecosystem tool (Polly, Channels, System.Text.Json, LibGit2Sharp, etc.). Deleting a velosiped is a win even if the replacement is boring.
