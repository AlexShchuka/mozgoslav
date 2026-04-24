# internet research MCP on by default

OpenCode needs live web access out of the box so agents can search, fetch and analyse articles while iterating on Mozgoslav itself. Ship a web-search / web-fetch MCP in the default enabled set (Brave Search or equivalent). This is a deliberate privacy-posture exception that applies to OpenCode only — the rest of the app stays offline. The exception is explicit in settings: the web MCP can be disabled per session, and every outbound domain is logged locally.
