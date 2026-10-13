#!/usr/bin/env node

/**
 * CLI utility to rename an active DeepSeek Harness session via the internal API Gateway.
 *
 * Usage:
 *   dsh-rename "New Session Title"
 *   dsh-rename <sessionId> "New Session Title"
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: dsh-rename [sessionId] <newTitle>");
  process.exit(1);
}

let sessionId = process.env.DSH_SESSION_ID;
let newTitle = args[0];

if (args.length >= 2) {
  sessionId = args[0];
  newTitle = args.slice(1).join(" ");
}

if (!sessionId) {
  console.error("Error: No sessionId specified and $DSH_SESSION_ID is not set.");
  process.exit(1);
}

const credPath = path.join(process.env.HOME || "/home/amadeus", ".dsh", ".credentials.yaml");
if (!fs.existsSync(credPath)) {
  console.error(`Error: Credentials file not found at ${credPath}`);
  process.exit(1);
}

const credContent = fs.readFileSync(credPath, "utf8");
const match = credContent.match(/client-connection\/browser-session:[\s\S]*?secret:\s*([A-Za-z0-9_-]+)/);
if (!match) {
  console.error("Error: Could not find browser-session secret in .credentials.yaml");
  process.exit(1);
}

const secretB64 = match[1];

function decodeBase64Url(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(value.replaceAll("-", "+").replaceAll("_", "/") + padding, "base64");
}

function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

const secret = decodeBase64Url(secretB64);
const webUrlStr = process.env.DSH_WEB_URL || "http://127.0.0.1:3080";
const webUrl = new URL(webUrlStr);
const authority = webUrl.host;

const cookieName = "dsh-auth-" + encodeBase64Url(crypto.createHash("sha256").update(authority).digest());
const now = Date.now();
const payload = {
  version: 1,
  authority,
  issuedAt: now,
  expiresAt: now + 86400000,
};
const body = encodeBase64Url(Buffer.from(JSON.stringify(payload), "utf8"));
const sig = encodeBase64Url(crypto.createHmac("sha256", secret).update(body).digest());
const cookieHeader = `${cookieName}=v1.${body}.${sig}`;

const rpcPayload = {
  type: "client-request",
  rpcId: crypto.randomUUID(),
  method: "session/rename",
  payload: {
    args: {
      request: {
        sessionId,
        title: newTitle,
      },
    },
  },
};

const res = await fetch(`${webUrl.origin}/api/session/rename`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: cookieHeader,
  },
  body: JSON.stringify(rpcPayload),
});

if (!res.ok) {
  const text = await res.text();
  console.error(`HTTP ${res.status}: ${text}`);
  process.exit(1);
}

const json = await res.json();
if (json.result?.ok) {
  console.log(`Successfully renamed session "${sessionId}" to "${json.result.value.title}" (seq: ${json.result.value.seq})`);
} else {
  console.error("RPC Error:", JSON.stringify(json.result?.error || json));
  process.exit(1);
}
