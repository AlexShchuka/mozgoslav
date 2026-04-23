# silent IO errors in plugin installer

`GitHubPluginInstaller` swallows `IOException` and `UnauthorizedAccessException` with empty catch blocks during plugin installation. Failures disappear without a log — a broken install looks successful. Surface these with at least a warning log and aggregate into the diagnostics report so the install-flow can flag the failure.
