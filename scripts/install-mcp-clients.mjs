#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");

const defaults = {
  name: "capitao-diff",
  cwd: repoRoot,
  serverPath: resolve(repoRoot, "packages/mcp-server/dist/index.js"),
  buildIfMissing: true,
  targets: ["cursor", "codex"],
  cursorConfigPath: resolve(homedir(), ".cursor", "mcp.json"),
  codexConfigPath: resolve(homedir(), ".codex", "config.toml"),
  claudeConfigPath: resolve(homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json")
};

const printHelp = () => {
  console.log(`Capitao Diff MCP installer\n\nUsage:\n  node scripts/install-mcp-clients.mjs [options]\n\nOptions:\n  --name <server-name>         MCP server id (default: capitao-diff)\n  --cwd <dir-path>             Working directory for server (default: repo root)\n  --server <file-path>         MCP server entry file (default: packages/mcp-server/dist/index.js)\n  --targets <list>             Comma list: cursor,codex,claude (default: cursor,codex)\n  --cursor-config <file-path>  Cursor mcp.json path\n  --codex-config <file-path>   Codex config.toml path\n  --claude-config <file-path>  Claude config JSON path\n  --no-build                   Skip auto-build when server dist is missing\n  --help                       Show this help\n`);
};

const normalizeTargets = (value) =>
  value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index);

const parseArgs = () => {
  const args = process.argv.slice(2);

  const options = { ...defaults };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help") {
      printHelp();
      process.exit(0);
    }

    if (arg === "--name") {
      options.name = args[index + 1] ?? options.name;
      index += 1;
      continue;
    }

    if (arg === "--cwd") {
      options.cwd = resolve(args[index + 1] ?? options.cwd);
      index += 1;
      continue;
    }

    if (arg === "--server") {
      options.serverPath = resolve(args[index + 1] ?? options.serverPath);
      index += 1;
      continue;
    }

    if (arg === "--targets") {
      options.targets = normalizeTargets(args[index + 1] ?? "");
      index += 1;
      continue;
    }

    if (arg === "--cursor-config") {
      options.cursorConfigPath = resolve(args[index + 1] ?? options.cursorConfigPath);
      index += 1;
      continue;
    }

    if (arg === "--codex-config") {
      options.codexConfigPath = resolve(args[index + 1] ?? options.codexConfigPath);
      index += 1;
      continue;
    }

    if (arg === "--claude-config") {
      options.claudeConfigPath = resolve(args[index + 1] ?? options.claudeConfigPath);
      index += 1;
      continue;
    }

    if (arg === "--no-build") {
      options.buildIfMissing = false;
      continue;
    }
  }

  if (options.targets.length === 0) {
    throw new Error("No valid target received. Use --targets cursor,codex,claude");
  }

  return options;
};

const pathExists = async (path) => {
  try {
    await readFile(path, "utf8");
    return true;
  } catch {
    return false;
  }
};

const ensureServerBuild = async (serverPath, shouldBuild) => {
  if (await pathExists(serverPath)) {
    return;
  }

  if (!shouldBuild) {
    throw new Error(`MCP server file not found: ${serverPath}`);
  }

  console.log("MCP dist file not found. Building @capitao-diff/mcp-server with workspace dependencies...");

  const build = spawnSync("pnpm", ["-r", "--filter", "@capitao-diff/mcp-server...", "build"], {
    cwd: repoRoot,
    stdio: "inherit"
  });

  if (build.status !== 0) {
    throw new Error("Failed to build @capitao-diff/mcp-server.");
  }

  if (!(await pathExists(serverPath))) {
    throw new Error(`Build finished, but server file still not found: ${serverPath}`);
  }
};

const ensureJsonConfig = async (filePath, defaultValue) => {
  if (!(await pathExists(filePath))) {
    return defaultValue;
  }

  const raw = await readFile(filePath, "utf8");

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return defaultValue;
    }
    return parsed;
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${String(error)}`);
  }
};

const saveJsonConfig = async (filePath, value) => {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const installCursor = async (options) => {
  const config = await ensureJsonConfig(options.cursorConfigPath, { mcpServers: {} });

  if (!config.mcpServers || typeof config.mcpServers !== "object") {
    config.mcpServers = {};
  }

  config.mcpServers[options.name] = {
    type: "stdio",
    command: "node",
    args: [options.serverPath],
    cwd: options.cwd,
    env: {}
  };

  await saveJsonConfig(options.cursorConfigPath, config);
  return options.cursorConfigPath;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const installCodex = async (options) => {
  const block = [
    `[mcp_servers.${options.name}]`,
    'command = "node"',
    `args = ["${options.serverPath.replaceAll("\\", "\\\\")}"]`,
    "enabled = true",
    "startup_timeout_sec = 45"
  ].join("\n");

  let content = "";
  if (await pathExists(options.codexConfigPath)) {
    content = await readFile(options.codexConfigPath, "utf8");
  }

  const sectionRegex = new RegExp(
    `\\[mcp_servers\\.${escapeRegExp(options.name)}\\][\\s\\S]*?(?=\\n\\[[^\\n]+\\]|$)`,
    "m"
  );

  if (sectionRegex.test(content)) {
    content = content.replace(sectionRegex, block);
  } else {
    const trimmed = content.trimEnd();
    content = trimmed.length > 0 ? `${trimmed}\n\n${block}\n` : `${block}\n`;
  }

  await mkdir(dirname(options.codexConfigPath), { recursive: true });
  await writeFile(options.codexConfigPath, content, "utf8");
  return options.codexConfigPath;
};

const installClaude = async (options) => {
  const config = await ensureJsonConfig(options.claudeConfigPath, { mcpServers: {} });

  if (!config.mcpServers || typeof config.mcpServers !== "object") {
    config.mcpServers = {};
  }

  config.mcpServers[options.name] = {
    command: "node",
    args: [options.serverPath],
    cwd: options.cwd,
    env: {}
  };

  await saveJsonConfig(options.claudeConfigPath, config);
  return options.claudeConfigPath;
};

const main = async () => {
  const options = parseArgs();
  await ensureServerBuild(options.serverPath, options.buildIfMissing);

  const results = [];

  if (options.targets.includes("cursor")) {
    results.push({ target: "cursor", path: await installCursor(options) });
  }

  if (options.targets.includes("codex")) {
    results.push({ target: "codex", path: await installCodex(options) });
  }

  if (options.targets.includes("claude")) {
    results.push({ target: "claude", path: await installClaude(options) });
  }

  console.log("MCP server installed successfully.");
  console.log(`- server: ${options.name}`);
  for (const result of results) {
    console.log(`- ${result.target}: ${result.path}`);
  }
  console.log("Restart your MCP client(s) to load the new entry.");
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
