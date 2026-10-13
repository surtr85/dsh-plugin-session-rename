import test from "node:test";
import assert from "node:assert/strict";
import { apply, name, inject } from "../index.js";

test("plugin metadata", () => {
  assert.equal(name, "dsh-plugin-session-rename");
  assert.deepEqual(inject, ["tools", "sessionTitle"]);
});

test("plugin registers session_rename tool with expected schema", () => {
  let registeredTool = null;

  const mockCtx = {
    logger: { info: () => {} },
    tools: {
      register: (tool) => {
        registeredTool = tool;
      },
    },
    get: (service) => {
      if (service === "sessionTitle") {
        return {
          rename: (session, title) => {
            return { title: title.trim(), eventSeq: 42 };
          },
        };
      }
      return null;
    },
  };

  apply(mockCtx);

  assert.ok(registeredTool, "Tool should be registered");
  assert.equal(registeredTool.name, "session_rename");
  assert.ok(registeredTool.parameters.properties.title, "title property must exist");
  assert.deepEqual(registeredTool.parameters.required, ["title"]);
});

test("execute successfully renames session and returns title & seq", async () => {
  let registeredTool = null;

  const mockCtx = {
    logger: { info: () => {} },
    tools: {
      register: (tool) => {
        registeredTool = tool;
      },
    },
    get: (service) => {
      if (service === "sessionTitle") {
        return {
          rename: (session, title) => {
            return { title: title.trim(), eventSeq: 100 };
          },
        };
      }
      return null;
    },
  };

  apply(mockCtx);

  const mockExec = {
    agent: {
      session: { id: "mock-session" },
    },
  };

  const result = await registeredTool.execute({ title: "  Clean Architecture Session  " }, mockExec);
  assert.deepEqual(result, {
    title: "Clean Architecture Session",
    seq: 100,
  });
});

test("execute throws on missing agent session or empty title", async () => {
  let registeredTool = null;

  const mockCtx = {
    logger: { info: () => {} },
    tools: {
      register: (tool) => {
        registeredTool = tool;
      },
    },
    get: () => ({ rename: () => {} }),
  };

  apply(mockCtx);

  await assert.rejects(
    async () => registeredTool.execute({ title: "Test" }, {}),
    /requires an active agent session/
  );

  await assert.rejects(
    async () => registeredTool.execute({ title: "" }, { agent: { session: {} } }),
    /requires a non-empty title/
  );
});
