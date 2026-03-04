export type SupportedLanguage = "en" | "pt";

export type QaVerdict = "approved" | "rejected";

export interface DiffFileImpact {
  filePath: string;
  impactScore: number;
  touchesUI: boolean;
  reasons: string[];
}

export interface DiffAnalysis {
  baseBranch: string;
  currentBranch: string;
  filesChanged: number;
  impactedComponents: string[];
  files: DiffFileImpact[];
}

export interface BrowserScenarioResult {
  scenario: string;
  status: "passed" | "failed";
  note: string;
}

export interface PlaywrightArtifacts {
  screenshots: string[];
  consoleErrors: string[];
  networkFailures: string[];
  hydrationErrors: string[];
  scenarios: BrowserScenarioResult[];
  viewportReports: Array<{
    viewport: string;
    responsive: boolean;
    note: string;
  }>;
}

export interface UiAnalysis {
  layoutConsistencyScore: number;
  spacingScore: number;
  typographyScore: number;
  responsivenessScore: number;
  notes: string[];
}

export interface StressTestResult {
  case: string;
  status: "stable" | "unstable";
  note: string;
}

export interface UxEvaluation {
  loadingStates: "good" | "missing";
  skeletons: "present" | "missing";
  accessibilityScore: number;
  notes: string[];
}

export interface QaReport {
  runId: string;
  language: SupportedLanguage;
  createdAt: string;
  diffAnalysis: DiffAnalysis;
  playwright: PlaywrightArtifacts;
  uiAnalysis: UiAnalysis;
  stressTests: StressTestResult[];
  ux: UxEvaluation;
  verdict: QaVerdict;
  score: number;
  summary: string;
  markdown: string;
}

export interface QaRunInput {
  baseUrl: string;
  baseBranch: string;
  language: SupportedLanguage;
  auth?: {
    email?: string;
    password?: string;
  };
  projectRoot?: string;
  headless?: boolean;
}

export interface CapitaoDiffConfig {
  qa: {
    baseUrl: string;
    baseBranch: string;
    projectPort?: number;
    framework?: string;
  };
  auth?: {
    email?: string;
    password?: string;
  };
  twoFactor?: {
    enabled: boolean;
    provider?: string;
    url?: string;
  };
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export const createConsoleLogger = (): Logger => ({
  info: (message: string) => console.log(message),
  warn: (message: string) => console.warn(message),
  error: (message: string) => console.error(message)
});
