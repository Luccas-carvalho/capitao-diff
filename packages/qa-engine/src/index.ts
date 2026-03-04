import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { basename } from "node:path";
import { randomUUID } from "node:crypto";

import { createTranslator } from "@capitao-diff/i18n";
import { runPlaywrightMission } from "@capitao-diff/playwright-runner";
import type {
  DiffAnalysis,
  DiffFileImpact,
  PlaywrightArtifacts,
  QaReport,
  QaRunInput,
  QaVerdict,
  StressTestResult,
  SupportedLanguage,
  UiAnalysis,
  UxEvaluation
} from "@capitao-diff/shared";

const execFileAsync = promisify(execFile);

const execGit = async (args: string[], cwd?: string): Promise<string> => {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    maxBuffer: 1024 * 1024 * 10
  });
  return stdout.trim();
};

const normalizeBaseBranch = async (baseBranch: string, cwd?: string): Promise<string> => {
  try {
    await execGit(["rev-parse", "--verify", baseBranch], cwd);
    return baseBranch;
  } catch {
    const candidates = ["dev", "origin/dev", "develop", "origin/develop", "main", "origin/main"];

    for (const candidate of candidates) {
      try {
        await execGit(["rev-parse", "--verify", candidate], cwd);
        return candidate;
      } catch {
        continue;
      }
    }

    return baseBranch;
  }
};

const computeImpact = (filePath: string): DiffFileImpact => {
  const lower = filePath.toLowerCase();
  const reasons: string[] = [];

  const touchesUI =
    lower.endsWith(".tsx") ||
    lower.endsWith(".jsx") ||
    lower.endsWith(".css") ||
    lower.endsWith(".scss") ||
    lower.includes("component") ||
    lower.includes("pages/") ||
    lower.includes("app/") ||
    lower.includes("styles/");

  if (touchesUI) {
    reasons.push("UI-related file change detected");
  }

  if (lower.includes("auth") || lower.includes("login")) {
    reasons.push("Authentication flow might be impacted");
  }

  if (lower.includes("layout") || lower.includes("header") || lower.includes("footer")) {
    reasons.push("Global layout surface touched");
  }

  let impactScore = 20;
  if (touchesUI) {
    impactScore += 45;
  }
  if (lower.endsWith(".tsx") || lower.endsWith(".jsx")) {
    impactScore += 15;
  }
  if (lower.includes("route") || lower.includes("page")) {
    impactScore += 10;
  }

  return {
    filePath,
    touchesUI,
    impactScore: Math.min(100, impactScore),
    reasons
  };
};

export const analyzeGitDiff = async (
  baseBranch: string,
  projectRoot?: string
): Promise<DiffAnalysis> => {
  const cwd = projectRoot ?? process.cwd();
  const normalizedBaseBranch = await normalizeBaseBranch(baseBranch, cwd);
  const currentBranch = await execGit(["branch", "--show-current"], cwd);

  let filesOutput = "";
  try {
    filesOutput = await execGit(["diff", "--name-only", `${normalizedBaseBranch}...HEAD`], cwd);
  } catch {
    filesOutput = await execGit(["diff", "--name-only", `${normalizedBaseBranch}`], cwd);
  }

  const filesChanged = filesOutput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const analyzedFiles = filesChanged.map(computeImpact);

  const impactedComponents = analyzedFiles
    .filter((file) => file.touchesUI)
    .map((file) => basename(file.filePath, basename(file.filePath).split(".").pop() ? `.${basename(file.filePath).split(".").pop()}` : undefined))
    .filter(Boolean)
    .slice(0, 20);

  return {
    baseBranch: normalizedBaseBranch,
    currentBranch,
    filesChanged: analyzedFiles.length,
    impactedComponents,
    files: analyzedFiles
  };
};

export const analyzeConsoleErrors = (artifacts: PlaywrightArtifacts): string[] => artifacts.consoleErrors;

export const analyzeNetworkFailures = (artifacts: PlaywrightArtifacts): string[] => artifacts.networkFailures;

export const analyzeUiLayout = (
  artifacts: PlaywrightArtifacts,
  diffAnalysis: DiffAnalysis
): UiAnalysis => {
  const hasLayoutFile = diffAnalysis.files.some((file) => file.filePath.toLowerCase().includes("layout"));
  const responsivenessPenalty = artifacts.viewportReports.some((report) => !report.responsive) ? 30 : 0;
  const consolePenalty = Math.min(30, artifacts.consoleErrors.length * 5);
  const networkPenalty = Math.min(20, artifacts.networkFailures.length * 4);

  const layoutConsistencyScore = Math.max(0, 100 - consolePenalty - (hasLayoutFile ? 10 : 0));
  const spacingScore = Math.max(0, 90 - (hasLayoutFile ? 15 : 0));
  const typographyScore = Math.max(0, 88 - (artifacts.hydrationErrors.length > 0 ? 10 : 0));
  const responsivenessScore = Math.max(0, 100 - responsivenessPenalty - networkPenalty);

  const notes: string[] = [];
  if (hasLayoutFile) {
    notes.push("Layout files changed; visual regression risk increased.");
  }
  if (artifacts.consoleErrors.length > 0) {
    notes.push("Console errors detected during browser run.");
  }
  if (artifacts.networkFailures.length > 0) {
    notes.push("Network failures detected during browser run.");
  }

  return {
    layoutConsistencyScore,
    spacingScore,
    typographyScore,
    responsivenessScore,
    notes
  };
};

export const evaluateCodePatterns = async (
  baseBranch: string,
  projectRoot?: string
): Promise<string[]> => {
  const cwd = projectRoot ?? process.cwd();
  const normalizedBaseBranch = await normalizeBaseBranch(baseBranch, cwd);
  const patch = await execGit(["diff", `${normalizedBaseBranch}...HEAD`], cwd).catch(() => "");

  const warnings: string[] = [];

  if (patch.includes("console.log(")) {
    warnings.push("Diff includes console.log statements.");
  }
  if (patch.includes("TODO") || patch.includes("FIXME")) {
    warnings.push("Diff contains TODO/FIXME markers.");
  }
  if (patch.includes("@ts-ignore")) {
    warnings.push("Diff introduces @ts-ignore usage.");
  }

  return warnings;
};

const evaluateUx = (
  artifacts: PlaywrightArtifacts,
  diffAnalysis: DiffAnalysis,
  stressTests: StressTestResult[]
): UxEvaluation => {
  const hasLoadingSignals = diffAnalysis.files.some((file) => file.filePath.toLowerCase().includes("loading"));
  const stableStressRate =
    stressTests.length > 0
      ? stressTests.filter((test) => test.status === "stable").length / stressTests.length
      : 0;

  const accessibilityScore = Math.round(70 + stableStressRate * 20 - artifacts.consoleErrors.length * 2);

  return {
    loadingStates: hasLoadingSignals ? "good" : "missing",
    skeletons: diffAnalysis.files.some((file) => file.filePath.toLowerCase().includes("skeleton"))
      ? "present"
      : "missing",
    accessibilityScore: Math.max(0, Math.min(100, accessibilityScore)),
    notes: [
      hasLoadingSignals
        ? "Loading state files detected in diff."
        : "No loading-state indicators found in changed files.",
      stableStressRate >= 0.6
        ? "Stress checks remained mostly stable."
        : "Stress checks indicate potentially fragile interactions."
    ]
  };
};

const buildScore = (
  artifacts: PlaywrightArtifacts,
  ui: UiAnalysis,
  stressTests: StressTestResult[],
  codePatternWarnings: string[]
): number => {
  const avgUiScore =
    (ui.layoutConsistencyScore + ui.spacingScore + ui.typographyScore + ui.responsivenessScore) / 4;

  const stressPenalty = stressTests.filter((test) => test.status === "unstable").length * 8;
  const consolePenalty = artifacts.consoleErrors.length * 5;
  const networkPenalty = artifacts.networkFailures.length * 5;
  const codePenalty = codePatternWarnings.length * 4;

  return Math.max(0, Math.min(100, Math.round(avgUiScore - stressPenalty - consolePenalty - networkPenalty - codePenalty)));
};

const decideVerdict = (score: number, artifacts: PlaywrightArtifacts): QaVerdict => {
  if (artifacts.networkFailures.length > 3 || artifacts.consoleErrors.length > 5) {
    return "rejected";
  }

  return score >= 70 ? "approved" : "rejected";
};

const renderMarkdown = (
  language: SupportedLanguage,
  verdict: QaVerdict,
  score: number,
  diffAnalysis: DiffAnalysis,
  artifacts: PlaywrightArtifacts,
  ui: UiAnalysis,
  stressTests: StressTestResult[],
  ux: UxEvaluation,
  codePatternWarnings: string[]
): string => {
  const tCommon = createTranslator(language, "common");
  const tQa = createTranslator(language, "qa");
  const label = tCommon("result.label");
  const status = verdict === "approved" ? tCommon("result.approved") : tCommon("result.rejected");

  return [
    `# ${label}`,
    "",
    `**${status}**`,
    "",
    `${tQa("report.score")}: **${score}/100**`,
    "",
    `## ${tQa("report.diff")}`,
    `- ${tQa("report.baseBranch")}: ${diffAnalysis.baseBranch}`,
    `- ${tQa("report.currentBranch")}: ${diffAnalysis.currentBranch}`,
    `- ${tQa("report.filesChanged")}: ${diffAnalysis.filesChanged}`,
    `- ${tQa("report.impacted")}: ${diffAnalysis.impactedComponents.join(", ") || tQa("report.none")}`,
    "",
    `## ${tQa("report.browser")}`,
    `- ${tQa("report.screenshots")}: ${artifacts.screenshots.length}`,
    `- ${tQa("report.console")}: ${artifacts.consoleErrors.length}`,
    `- ${tQa("report.network")}: ${artifacts.networkFailures.length}`,
    `- ${tQa("report.hydration")}: ${artifacts.hydrationErrors.length}`,
    "",
    `## ${tQa("report.ui")}`,
    `- ${tQa("report.layout")}: ${ui.layoutConsistencyScore}`,
    `- ${tQa("report.spacing")}: ${ui.spacingScore}`,
    `- ${tQa("report.typography")}: ${ui.typographyScore}`,
    `- ${tQa("report.responsiveness")}: ${ui.responsivenessScore}`,
    "",
    `## ${tQa("report.stress")}`,
    ...stressTests.map((test) => `- ${test.case}: ${test.status} (${test.note})`),
    "",
    `## ${tQa("report.ux")}`,
    `- ${tQa("report.loading")}: ${ux.loadingStates}`,
    `- ${tQa("report.skeleton")}: ${ux.skeletons}`,
    `- ${tQa("report.accessibility")}: ${ux.accessibilityScore}`,
    "",
    `## ${tQa("report.code")}`,
    ...(codePatternWarnings.length > 0 ? codePatternWarnings.map((warning) => `- ${warning}`) : [`- ${tQa("report.none")}`])
  ].join("\n");
};

export const generateQaReport = (payload: {
  language: SupportedLanguage;
  diffAnalysis: DiffAnalysis;
  artifacts: PlaywrightArtifacts;
  ui: UiAnalysis;
  stressTests: StressTestResult[];
  ux: UxEvaluation;
  codePatternWarnings: string[];
}): QaReport => {
  const score = buildScore(payload.artifacts, payload.ui, payload.stressTests, payload.codePatternWarnings);
  const verdict = decideVerdict(score, payload.artifacts);
  const tCommon = createTranslator(payload.language, "common");
  const tQa = createTranslator(payload.language, "qa");

  const summary =
    verdict === "approved"
      ? tCommon("tone.approved")
      : `${tCommon("tone.rejected")} (${payload.artifacts.consoleErrors.length} ${tQa("report.console")} / ${payload.artifacts.networkFailures.length} ${tQa("report.network")})`;

  const markdown = renderMarkdown(
    payload.language,
    verdict,
    score,
    payload.diffAnalysis,
    payload.artifacts,
    payload.ui,
    payload.stressTests,
    payload.ux,
    payload.codePatternWarnings
  );

  return {
    runId: randomUUID(),
    language: payload.language,
    createdAt: new Date().toISOString(),
    diffAnalysis: payload.diffAnalysis,
    playwright: payload.artifacts,
    uiAnalysis: payload.ui,
    stressTests: payload.stressTests,
    ux: payload.ux,
    verdict,
    score,
    summary,
    markdown
  };
};

export const runQaPipeline = async (input: QaRunInput): Promise<QaReport> => {
  const diffAnalysis = await analyzeGitDiff(input.baseBranch, input.projectRoot);
  const playwrightResult = await runPlaywrightMission({
    baseUrl: input.baseUrl,
    auth: input.auth,
    headless: input.headless ?? false
  });

  const uiAnalysis = analyzeUiLayout(playwrightResult.artifacts, diffAnalysis);
  const codePatternWarnings = await evaluateCodePatterns(input.baseBranch, input.projectRoot);
  const ux = evaluateUx(playwrightResult.artifacts, diffAnalysis, playwrightResult.stressTests);

  return generateQaReport({
    language: input.language,
    diffAnalysis,
    artifacts: playwrightResult.artifacts,
    ui: uiAnalysis,
    stressTests: playwrightResult.stressTests,
    ux,
    codePatternWarnings
  });
};

export const formatQaDecision = (report: QaReport): string => {
  const tCommon = createTranslator(report.language, "common");
  const resultLabel = tCommon("result.label");
  const verdictText = report.verdict === "approved" ? tCommon("result.approved") : tCommon("result.rejected");

  return `${resultLabel}\n\n${verdictText}`;
};
