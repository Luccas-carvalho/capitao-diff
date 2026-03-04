#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const installer = resolve(scriptDir, "install-mcp-clients.mjs");

const forwardArgs = process.argv.slice(2);
const child = spawnSync("node", [installer, "--targets", "cursor", ...forwardArgs], {
  stdio: "inherit"
});

process.exitCode = child.status ?? 1;
