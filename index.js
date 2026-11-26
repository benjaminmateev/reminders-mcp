#!/usr/bin/env node
// Small Apple Reminders MCP: list, search, create, complete. Talks to Reminders.app via JXA.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { execFile } from "node:child_process";
import { z } from "zod";

// One JXA script, dispatched by op. Arguments travel as a JSON argv string, never spliced into code.
const JXA = `
function run(argv) {
  const a = JSON.parse(argv[0]);
  const R = Application('Reminders');
  const findList = (name) => {
    if (!name) return R.defaultList();
    const hit = R.lists.whose({ name: name })();
    if (!hit.length) throw new Error('No list named ' + name);
    if (hit.length > 1) throw new Error('Several lists are named ' + name + '; rename one in Reminders');
    return hit[0];
  };
  const dump = (l, completed) => {
    const rs = completed ? l.reminders : l.reminders.whose({ completed: false });
    const id = rs.id(), name = rs.name(), due = rs.dueDate(), body = rs.body(), done = rs.completed();
    return id.map((_, i) => ({ id: id[i], title: name[i], due: due[i], notes: body[i] || null, completed: done[i], list: l.name() }));
  };
  switch (a.op) {
    case 'lists':
      return JSON.stringify(R.lists().map(l => ({ id: l.id(), name: l.name() })));
    case 'reminders': {
      const lists = a.list ? [findList(a.list)] : R.lists();
      let out = [].concat(...lists.map(l => dump(l, a.includeCompleted)));
      if (a.query) { const q = a.query.toLowerCase(); out = out.filter(r => (r.title + ' ' + (r.notes || '')).toLowerCase().includes(q)); }
      return JSON.stringify(out.slice(0, a.limit));
    }
    case 'create': {
      const props = { name: a.title };
      if (a.notes) props.body = a.notes;
      if (a.due) {
        const m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(a.due);
        if (m) props.alldayDueDate = new Date(+m[1], +m[2] - 1, +m[3]);
        else props.dueDate = new Date(a.due);
      }
      const r = R.Reminder(props);
      findList(a.list).reminders.push(r);
      return JSON.stringify({ id: r.id(), title: r.name(), due: r.dueDate() });
    }
    case 'complete': {
      const r = R.reminders.byId(a.id);
      r.completed = true;
      return JSON.stringify({ id: a.id, title: r.name(), completed: r.completed() });
    }
  }
  throw new Error('unknown op ' + a.op);
}`;

const jxa = (args) =>
  new Promise((resolve, reject) =>
    execFile("osascript", ["-l", "JavaScript", "-e", JXA, JSON.stringify(args)], { timeout: 30000, maxBuffer: 32 << 20 }, (err, stdout, stderr) =>
      err ? reject(new Error((stderr || err.message).trim())) : resolve(stdout.trim())));

const tool = (fn) => async (args) => {
  try { return { content: [{ type: "text", text: await fn(args) }] }; }
  catch (e) { return { isError: true, content: [{ type: "text", text: String(e.message || e) }] }; }
};

const server = new McpServer({ name: "reminders-mcp", version: "0.1.0" });

server.registerTool("list_lists", {
  description: "List all Reminders lists (id, name).",
  inputSchema: {},
}, tool(() => jxa({ op: "lists" })));

server.registerTool("list_reminders", {
  description: "List reminders, open ones by default. Optional list name, text query (title + notes), includeCompleted, limit.",
  inputSchema: {
    list: z.string().max(200).optional(),
    query: z.string().max(200).optional(),
    includeCompleted: z.boolean().default(false),
    limit: z.number().int().min(1).max(500).default(100),
  },
}, tool((a) => jxa({ op: "reminders", ...a })));

server.registerTool("create_reminder", {
  description: "Create a reminder. due: YYYY-MM-DD (all-day) or ISO date-time. list defaults to the default list.",
  inputSchema: {
    title: z.string().min(1).max(500),
    list: z.string().max(200).optional(),
    due: z.string().max(40).optional(),
    notes: z.string().max(5000).optional(),
  },
}, tool((a) => {
  if (a.due && isNaN(Date.parse(a.due))) throw new Error("due is not a valid date: " + a.due);
  return jxa({ op: "create", ...a });
}));

server.registerTool("complete_reminder", {
  description: "Mark a reminder as completed by id (from list_reminders).",
  inputSchema: { id: z.string().startsWith("x-apple-reminder://").max(200) },
}, tool((a) => jxa({ op: "complete", ...a })));

server.connect(new StdioServerTransport());
