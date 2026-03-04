#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { runPlaywrightMission } from "@capitao-diff/playwright-runner";
import {
  analyzeGitDiff,
  analyzeNetworkFailures,
  analyzeConsoleErrors,
  analyzeUiLayout,
  evaluateCodePatterns,
  formatQaDecision,
  runQaPipeline
} from "@capitao-diff/qa-engine";
import type { SupportedLanguage } from "@capitao-diff/shared";

interface ToolArgs {
  baseUrl?: string;
  baseBranch?: string;
  language?: SupportedLanguage;
  headless?: boolean;
  projectRoot?: string;
  email?: string;
  password?: string;
}

const parseArgs = (raw: unknown): ToolArgs => {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  return raw as ToolArgs;
};

const ensureBaseUrl = (baseUrl?: string): string => {
  if (!baseUrl) {
    throw new Error("Missing required argument: baseUrl");
  }

  return baseUrl;
};

const ensureBaseBranch = (baseBranch?: string): string => baseBranch ?? "dev";
const ensureLanguage = (language?: SupportedLanguage): SupportedLanguage =>
  language === "pt" || language === "en" ? language : "en";

const server = new Server(
  {
    name: "capitao-diff-mcp-server",
    version: "0.1.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "analyze_git_diff",
      description: "Analyze the current git diff against a base branch and detect UI impact.",
      inputSchema: {
        type: "object",
        properties: {
          baseBranch: { type: "string" },
          projectRoot: { type: "string" }
        }
      }
    },
    {
      name: "run_playwright_tests",
      description: "Run Playwright tests with desktop and mobile viewport coverage.",
      inputSchema: {
        type: "object",
        properties: {
          baseUrl: { type: "string" },
          headless: { type: "boolean" },
          email: { type: "string" },
          password: { type: "string" }
        },
        required: ["baseUrl"]
      }
    },
    {
      name: "capture_screenshots",
      description: "Capture screenshots from desktop and mobile runs.",
      inputSchema: {
        type: "object",
        properties: {
          baseUrl: { type: "string" },
          headless: { type: "boolean" }
        },
        required: ["baseUrl"]
      }
    },
    {
      name: "analyze_console_errors",
      description: "Run browser mission and return captured console errors.",
      inputSchema: {
        type: "object",
        properties: {
          baseUrl: { type: "string" },
          headless: { type: "boolean" }
        },
        required: ["baseUrl"]
      }
    },
    {
      name: "analyze_network_failures",
      description: "Run browser mission and return captured network failures.",
      inputSchema: {
        type: "object",
        properties: {
          baseUrl: { type: "string" },
          headless: { type: "boolean" }
        },
        required: ["baseUrl"]
      }
    },
    {
      name: "analyze_ui_layout",
      description: "Evaluate layout consistency, spacing, typography, and responsiveness.",
      inputSchema: {
        type: "object",
        properties: {
          baseUrl: { type: "string" },
          baseBranch: { type: "string" },
          headless: { type: "boolean" }
        },
        required: ["baseUrl"]
      }
    },
    {
      name: "evaluate_code_patterns",
      description: "Evaluate risky code patterns from current git diff.",
      inputSchema: {
        type: "object",
        properties: {
          baseBranch: { type: "string" },
          projectRoot: { type: "string" }
        }
      }
    },
    {
      name: "generate_qa_report",
      description: "Run full QA pipeline and generate a structured report.",
      inputSchema: {
        type: "object",
        properties: {
          baseUrl: { type: "string" },
          baseBranch: { type: "string" },
          language: { type: "string", enum: ["en", "pt"] },
          headless: { type: "boolean" },
          projectRoot: { type: "string" },
          email: { type: "string" },
          password: { type: "string" }
        },
        required: ["baseUrl"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = parseArgs(request.params.arguments);

  try {
    switch (request.params.name) {
      case "analyze_git_diff": {
        const diff = await analyzeGitDiff(ensureBaseBranch(args.baseBranch), args.projectRoot);
        return {
          content: [{ type: "text", text: JSON.stringify(diff, null, 2) }]
        };
      }

      case "run_playwright_tests": {
        const run = await runPlaywrightMission({
          baseUrl: ensureBaseUrl(args.baseUrl),
          headless: args.headless ?? false,
          auth: {
            email: args.email,
            password: args.password
          }
        });

        return {
          content: [{ type: "text", text: JSON.stringify(run, null, 2) }]
        };
      }

      case "capture_screenshots": {
        const run = await runPlaywrightMission({
          baseUrl: ensureBaseUrl(args.baseUrl),
          headless: args.headless ?? false
        });

        return {
          content: [{ type: "text", text: JSON.stringify(run.artifacts.screenshots, null, 2) }]
        };
      }

      case "analyze_console_errors": {
        const run = await runPlaywrightMission({
          baseUrl: ensureBaseUrl(args.baseUrl),
          headless: args.headless ?? false
        });

        return {
          content: [{ type: "text", text: JSON.stringify(analyzeConsoleErrors(run.artifacts), null, 2) }]
        };
      }

      case "analyze_network_failures": {
        const run = await runPlaywrightMission({
          baseUrl: ensureBaseUrl(args.baseUrl),
          headless: args.headless ?? false
        });

        return {
          content: [{ type: "text", text: JSON.stringify(analyzeNetworkFailures(run.artifacts), null, 2) }]
        };
      }

      case "analyze_ui_layout": {
        const baseBranch = ensureBaseBranch(args.baseBranch);
        const diff = await analyzeGitDiff(baseBranch, args.projectRoot);
        const run = await runPlaywrightMission({
          baseUrl: ensureBaseUrl(args.baseUrl),
          headless: args.headless ?? false
        });

        const ui = analyzeUiLayout(run.artifacts, diff);
        return {
          content: [{ type: "text", text: JSON.stringify(ui, null, 2) }]
        };
      }

      case "evaluate_code_patterns": {
        const warnings = await evaluateCodePatterns(ensureBaseBranch(args.baseBranch), args.projectRoot);
        return {
          content: [{ type: "text", text: JSON.stringify(warnings, null, 2) }]
        };
      }

      case "generate_qa_report": {
        const report = await runQaPipeline({
          baseUrl: ensureBaseUrl(args.baseUrl),
          baseBranch: ensureBaseBranch(args.baseBranch),
          language: ensureLanguage(args.language),
          projectRoot: args.projectRoot,
          headless: args.headless ?? false,
          auth: {
            email: args.email,
            password: args.password
          }
        });

        return {
          content: [
            { type: "text", text: formatQaDecision(report) },
            { type: "text", text: report.markdown }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: error instanceof Error ? error.message : String(error)
        }
      ]
    };
  }
});

const main = async (): Promise<void> => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
};

void main();
