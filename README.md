# reminders-mcp

A small MCP server for Apple Reminders on macOS. Four tools: `list_lists`, `list_reminders` (with search), `create_reminder`, `complete_reminder`. No dependencies beyond the MCP SDK; it talks to Reminders.app through JXA.

```sh
npm install
claude mcp add reminders -- node /path/to/reminders-mcp/index.js
```

Reminders.app must be running. On another Mac, run it over SSH:

```sh
claude mcp add reminders -- ssh -T my-mac 'node ~/reminders-mcp/index.js'
```

MIT licence.
