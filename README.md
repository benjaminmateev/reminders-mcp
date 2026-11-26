# reminders-mcp

Ask Claude what's on your list, add a reminder, tick one off. A small MCP server for Apple Reminders on macOS: one file, four tools (`list_lists`, `list_reminders` with search, `create_reminder`, `complete_reminder`). No delete. It talks to the Reminders app through JXA and never leaves your Mac.

## Install

**Claude Desktop:** download [reminders-mcp.mcpb](https://github.com/benjaminmateev/reminders-mcp/releases/latest/download/reminders-mcp.mcpb) and double-click it.

**Claude Code:**

```sh
claude plugin marketplace add benjaminmateev/reminders-mcp
claude plugin install reminders@reminders-mcp
```

The first call asks macOS for permission to control Reminders. Reminders.app must be running.

**On another Mac, over SSH:** clone the repo there, then

```sh
claude mcp add reminders -- ssh -T my-mac 'node ~/reminders-mcp/dist/server.cjs'
```

## Build

`index.js` is the source. `npm run build` bundles it into `dist/server.cjs`; `npm run pack` also makes the `.mcpb`.

MIT licence, see LICENSE.
