import { defineTool } from "@deepseek-ai/dsh-tools";

export const name = "dsh-plugin-session-rename";
export const inject = ["tools", "sessionTitle"];

/**
 * DeepSeek Harness Plugin entry point.
 * Mounts the `session_rename` tool into the agent loop.
 *
 * @param {import("@deepseek-ai/cordis").Context} ctx
 */
export function apply(ctx) {
  ctx.logger?.info?.("dsh-plugin-session-rename: mounting session_rename agent tool");

  ctx.tools.register(
    defineTool({
      name: "session_rename",
      description:
        "Rename the current session or conversation thread. Use this tool when the topic changes, after initial setup, or when asked to rename the session. Provide a concise, descriptive title in English.",
      parameters: {
        title: {
          type: "string",
          required: true,
          description: "The new concise, descriptive title for the session/thread in English.",
        },
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string", required: true },
            seq: { type: "integer", required: true },
          },
        },
        render: (_args, value) => [
          {
            type: "text",
            text: `Session successfully renamed to "${value.title}" (event sequence: ${value.seq})`,
          },
        ],
      },
      async execute(args, exec) {
        if (!exec?.agent?.session) {
          throw new Error("session_rename requires an active agent session");
        }

        const rawTitle = typeof args?.title === "string" ? args.title.trim() : "";
        if (!rawTitle) {
          throw new Error("session_rename requires a non-empty title");
        }

        const sessionTitle = ctx.get("sessionTitle");
        if (!sessionTitle) {
          throw new Error("sessionTitle service is not mounted in the current Cordis context");
        }

        const accepted = sessionTitle.rename(exec.agent.session, rawTitle);
        return {
          title: accepted.title,
          seq: accepted.eventSeq,
        };
      },
    })
  );
}
