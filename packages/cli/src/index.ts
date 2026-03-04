#!/usr/bin/env node
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";

import { createTranslator, detectLanguage } from "@capitao-diff/i18n";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { formatQaDecision, runQaPipeline } from "@capitao-diff/qa-engine";
import type { CapitaoDiffConfig, QaReport, SupportedLanguage } from "@capitao-diff/shared";
import { Command } from "commander";
import inquirer from "inquirer";
import { load, dump } from "js-yaml";
import { Octokit } from "octokit";

const execFileAsync = promisify(execFile);
const CONFIG_FILE = ".capitao-diff/config.yml";

const execGit = async (args: string[], cwd: string): Promise<string> => {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    maxBuffer: 1024 * 1024 * 4
  });

  return stdout.trim();
};

const pathExists = async (path: string): Promise<boolean> => {
  try {
    await readFile(path, "utf8");
    return true;
  } catch {
    return false;
  }
};

const ensureGitRepo = async (cwd: string): Promise<boolean> => {
  try {
    const result = await execGit(["rev-parse", "--is-inside-work-tree"], cwd);
    return result === "true";
  } catch {
    return false;
  }
};

const detectCurrentBranch = async (cwd: string): Promise<string | null> => {
  try {
    return await execGit(["branch", "--show-current"], cwd);
  } catch {
    return null;
  }
};

const detectDevBranch = async (cwd: string): Promise<string | null> => {
  const candidates = ["dev", "origin/dev", "develop", "origin/develop", "main", "origin/main"];

  for (const candidate of candidates) {
    try {
      await execGit(["rev-parse", "--verify", candidate], cwd);
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
};

const detectFramework = async (cwd: string): Promise<string | null> => {
  const packageJsonPath = join(cwd, "package.json");
  if (!(await pathExists(packageJsonPath))) {
    return null;
  }

  try {
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    if (deps.next) {
      return "next";
    }
    if (deps.react) {
      return "react";
    }
    if (deps.vue) {
      return "vue";
    }
    if (deps.svelte) {
      return "svelte";
    }

    return null;
  } catch {
    return null;
  }
};

const detectProjectPort = async (cwd: string): Promise<number | null> => {
  const packageJsonPath = join(cwd, "package.json");
  if (!(await pathExists(packageJsonPath))) {
    return null;
  }

  try {
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };

    const scripts = packageJson.scripts ?? {};
    const candidateScript = scripts.dev ?? scripts.start ?? "";

    const explicitPort = candidateScript.match(/(?:--port|-p|PORT=)(?:\s+)?(\d{2,5})/i);
    if (explicitPort?.[1]) {
      return Number.parseInt(explicitPort[1], 10);
    }

    if (candidateScript.includes("vite")) {
      return 5173;
    }

    if (candidateScript.includes("next")) {
      return 3000;
    }

    return 3000;
  } catch {
    return null;
  }
};

const loadConfig = async (cwd: string): Promise<CapitaoDiffConfig | null> => {
  const configPath = join(cwd, CONFIG_FILE);

  if (!(await pathExists(configPath))) {
    return null;
  }

  const raw = await readFile(configPath, "utf8");
  return load(raw) as CapitaoDiffConfig;
};

const saveConfig = async (cwd: string, config: CapitaoDiffConfig): Promise<string> => {
  const configPath = join(cwd, CONFIG_FILE);
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, dump(config), "utf8");
  return configPath;
};

const detectLanguageForCli = (): SupportedLanguage => {
  const env = process.env.CAPITAO_DIFF_LANG ?? process.env.LANG;
  return detectLanguage(env);
};

const writeReportFiles = async (cwd: string, report: QaReport): Promise<{ markdownPath: string; jsonPath: string }> => {
  const reportsDir = join(cwd, ".capitao-diff", "reports");
  await mkdir(reportsDir, { recursive: true });

  const markdownPath = join(reportsDir, `${report.runId}.md`);
  const jsonPath = join(reportsDir, `${report.runId}.json`);

  await Promise.all([
    writeFile(markdownPath, report.markdown, "utf8"),
    writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8")
  ]);

  return { markdownPath, jsonPath };
};

const runViaMcp = async (args: {
  baseUrl: string;
  baseBranch: string;
  language: SupportedLanguage;
  headless: boolean;
  email?: string;
  password?: string;
}): Promise<QaReport | null> => {
  const localServerPath = resolve(process.cwd(), "packages/mcp-server/dist/index.js");
  if (!(await pathExists(localServerPath))) {
    return null;
  }

  const transport = new StdioClientTransport({
    command: "node",
    args: [localServerPath]
  });

  const client = new Client(
    {
      name: "captain-diff-cli",
      version: "0.1.0"
    },
    {
      capabilities: {}
    }
  );

  await client.connect(transport);

  try {
    const response = (await client.callTool({
      name: "generate_qa_report",
      arguments: {
        baseUrl: args.baseUrl,
        baseBranch: args.baseBranch,
        language: args.language,
        headless: args.headless,
        email: args.email,
        password: args.password
      }
    })) as {
      content?: Array<{
        type: string;
        text?: string;
      }>;
    };

    const textPayload = (response.content ?? [])
      .filter((entry) => entry.type === "text")
      .map((entry) => entry.text ?? "");

    const markdown = textPayload[textPayload.length - 1] ?? "";
    const tQa = createTranslator(args.language, "qa");

    return {
      runId: `mcp-${Date.now()}`,
      language: args.language,
      createdAt: new Date().toISOString(),
      diffAnalysis: {
        baseBranch: args.baseBranch,
        currentBranch: "unknown",
        filesChanged: 0,
        impactedComponents: [],
        files: []
      },
      playwright: {
        screenshots: [],
        consoleErrors: [],
        networkFailures: [],
        hydrationErrors: [],
        scenarios: [],
        viewportReports: []
      },
      uiAnalysis: {
        layoutConsistencyScore: 0,
        spacingScore: 0,
        typographyScore: 0,
        responsivenessScore: 0,
        notes: []
      },
      stressTests: [],
      ux: {
        loadingStates: "missing",
        skeletons: "missing",
        accessibilityScore: 0,
        notes: []
      },
      verdict: markdown.includes("Not approved") || markdown.includes("Não aprovado") ? "rejected" : "approved",
      score: 0,
      summary: tQa("qa.summary"),
      markdown
    };
  } finally {
    await client.close();
  }
};

const publishGithubResult = async (params: {
  report: QaReport;
  owner: string;
  repo: string;
  prNumber: number;
  reportPath: string;
}): Promise<void> => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return;
  }

  const octokit = new Octokit({ auth: token });

  const verdictLabel = params.report.verdict === "approved" ? "APPROVED" : "REJECTED";
  const body = [
    `## Capitão Diff - QA Verdict: ${verdictLabel}`,
    "",
    params.report.summary,
    "",
    `- Score: ${params.report.score}`,
    `- Report: ${params.reportPath}`,
    "",
    "```",
    formatQaDecision(params.report),
    "```"
  ].join("\n");

  await octokit.rest.issues.createComment({
    owner: params.owner,
    repo: params.repo,
    issue_number: params.prNumber,
    body
  });

  if (process.env.GITHUB_SHA) {
    await octokit.rest.checks.create({
      owner: params.owner,
      repo: params.repo,
      name: "Capitão Diff QA Gate",
      head_sha: process.env.GITHUB_SHA,
      status: "completed",
      conclusion: params.report.verdict === "approved" ? "success" : "failure",
      output: {
        title: "Capitão Diff QA report",
        summary: params.report.summary,
        text: params.report.markdown.slice(0, 65_000)
      }
    });
  }
};

const buildInitConfig = async (cwd: string, language: SupportedLanguage): Promise<CapitaoDiffConfig> => {
  const t = createTranslator(language, "cli");

  const isGitRepo = await ensureGitRepo(cwd);
  if (!isGitRepo) {
    throw new Error(t("cli.error.git"));
  }

  const [currentBranch, baseBranchDetected, portDetected, frameworkDetected] = await Promise.all([
    detectCurrentBranch(cwd),
    detectDevBranch(cwd),
    detectProjectPort(cwd),
    detectFramework(cwd)
  ]);

  const questions = [] as Array<{
    type: "input";
    name: string;
    message: string;
    default?: string;
  }>;

  questions.push({
    type: "input",
    name: "baseUrl",
    message: t("cli.prompt.baseUrl"),
    default: `http://localhost:${portDetected ?? 3000}`
  });

  if (!baseBranchDetected) {
    questions.push({
      type: "input",
      name: "baseBranch",
      message: t("cli.prompt.baseBranch"),
      default: "dev"
    });
  }

  if (!portDetected) {
    questions.push({
      type: "input",
      name: "projectPort",
      message: t("cli.prompt.projectPort"),
      default: "3000"
    });
  }

  if (!frameworkDetected) {
    questions.push({
      type: "input",
      name: "framework",
      message: t("cli.prompt.framework"),
      default: "react"
    });
  }

  questions.push({
    type: "input",
    name: "email",
    message: t("cli.prompt.email"),
    default: "admin@test.com"
  });

  questions.push({
    type: "input",
    name: "password",
    message: t("cli.prompt.password"),
    default: "admin"
  });

  const answers = await inquirer.prompt(questions);

  return {
    qa: {
      baseUrl: answers.baseUrl,
      baseBranch: baseBranchDetected ?? answers.baseBranch,
      projectPort: portDetected ?? Number.parseInt(answers.projectPort ?? "3000", 10),
      framework: frameworkDetected ?? answers.framework ?? "react"
    },
    auth: {
      email: answers.email,
      password: answers.password
    },
    twoFactor: {
      enabled: false,
      provider: "mailhog",
      url: "http://localhost:8025"
    }
  };
};

const runQaCommand = async (
  cwd: string,
  options: {
    language: SupportedLanguage;
    headless: boolean;
    viaMcp: boolean;
  }
): Promise<{ report: QaReport; markdownPath: string; jsonPath: string }> => {
  const config = await loadConfig(cwd);
  const t = createTranslator(options.language, "cli");

  if (!config) {
    throw new Error(t("cli.error.config"));
  }

  const mcpReport =
    options.viaMcp === true
      ? await runViaMcp({
          baseUrl: config.qa.baseUrl,
          baseBranch: config.qa.baseBranch,
          language: options.language,
          headless: options.headless,
          email: config.auth?.email,
          password: config.auth?.password
        })
      : null;

  const report =
    mcpReport ??
    (await runQaPipeline({
      baseUrl: config.qa.baseUrl,
      baseBranch: config.qa.baseBranch,
      language: options.language,
      headless: options.headless,
      auth: {
        email: config.auth?.email,
        password: config.auth?.password
      },
      projectRoot: cwd
    }));

  const { markdownPath, jsonPath } = await writeReportFiles(cwd, report);
  return { report, markdownPath, jsonPath };
};

const runDoctor = async (cwd: string, language: SupportedLanguage): Promise<void> => {
  const t = createTranslator(language, "cli");

  console.log(t("cli.doctor.start"));

  const isGitRepo = await ensureGitRepo(cwd);
  const config = await loadConfig(cwd);
  const nodeVersion = process.version;

  let playwrightVersion = t("cli.playwright.unavailable");
  try {
    const { stdout } = await execFileAsync("pnpm", ["exec", "playwright", "--version"], { cwd });
    playwrightVersion = stdout.trim();
  } catch {
    playwrightVersion = t("cli.playwright.unavailable");
  }

  const okText = t("cli.state.ok");
  const missingText = t("cli.state.missing");

  console.log(`- ${t("cli.doctor.git")}: ${isGitRepo ? okText : missingText}`);
  console.log(`- ${t("cli.doctor.config")}: ${config ? okText : missingText}`);
  console.log(`- ${t("cli.doctor.node")}: ${nodeVersion}`);
  console.log(`- ${t("cli.doctor.playwright")}: ${playwrightVersion}`);
  console.log(t("cli.doctor.ok"));
};

const main = async (): Promise<void> => {
  const cwd = process.cwd();
  const language = detectLanguageForCli();
  const t = createTranslator(language, "cli");

  const program = new Command();

  program
    .name("captain-diff")
    .description("AI QA engineer that analyzes diffs, runs Playwright, and protects pull requests.")
    .version("0.1.0");

  program
    .command("init")
    .description("Initialize .capitao-diff/config.yml")
    .action(async () => {
      console.log(t("cli.init.start"));
      const config = await buildInitConfig(cwd, language);
      const saved = await saveConfig(cwd, config);
      console.log(t("cli.init.saved"));
      console.log(`- ${saved}`);
      console.log(`- branch: ${config.qa.baseBranch}`);
      console.log(`- framework: ${config.qa.framework}`);
    });

  program
    .command("test")
    .description("Run full QA pipeline")
    .option("--headless", "Run browser in headless mode", false)
    .option("--via-mcp", "Execute pipeline through MCP server", true)
    .action(async (opts: { headless: boolean; viaMcp: boolean }) => {
      console.log(t("cli.test.start"));
      const { report, markdownPath, jsonPath } = await runQaCommand(cwd, {
        language,
        headless: opts.headless,
        viaMcp: opts.viaMcp
      });

      console.log(formatQaDecision(report));
      console.log(report.summary);
      console.log(`- markdown: ${markdownPath}`);
      console.log(`- json: ${jsonPath}`);
      console.log(t("cli.test.done"));
    });

  program
    .command("pr-check")
    .description("Run QA pipeline and optionally publish result to GitHub pull request")
    .option("--headless", "Run browser in headless mode", false)
    .option("--via-mcp", "Execute pipeline through MCP server", true)
    .option("--owner <owner>", "GitHub repository owner")
    .option("--repo <repo>", "GitHub repository name")
    .option("--pr <number>", "Pull request number")
    .action(
      async (opts: {
        headless: boolean;
        viaMcp: boolean;
        owner?: string;
        repo?: string;
        pr?: string;
      }) => {
        console.log(t("cli.pr.start"));

        const { report, markdownPath } = await runQaCommand(cwd, {
          language,
          headless: opts.headless,
          viaMcp: opts.viaMcp
        });

        if (opts.owner && opts.repo && opts.pr) {
          await publishGithubResult({
            report,
            owner: opts.owner,
            repo: opts.repo,
            prNumber: Number.parseInt(opts.pr, 10),
            reportPath: markdownPath
          });
          console.log(t("cli.pr.githubUpdated"));
        }

        console.log(formatQaDecision(report));
        console.log(report.summary);
        console.log(t("cli.pr.done"));

        if (report.verdict === "rejected") {
          process.exitCode = 1;
        }
      }
    );

  program
    .command("doctor")
    .description("Diagnose environment readiness")
    .action(async () => {
      await runDoctor(cwd, language);
    });

  await program.parseAsync(process.argv);
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
