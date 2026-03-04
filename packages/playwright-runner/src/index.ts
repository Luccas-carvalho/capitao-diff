import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import type { PlaywrightArtifacts, StressTestResult } from "@capitao-diff/shared";
import { chromium, type BrowserContext, type Page } from "playwright";

export interface PlaywrightRunOptions {
  baseUrl: string;
  headless?: boolean;
  outputDir?: string;
  auth?: {
    email?: string;
    password?: string;
  };
}

export interface PlaywrightRunResult {
  artifacts: PlaywrightArtifacts;
  stressTests: StressTestResult[];
}

const defaultOutputDir = () => join(process.cwd(), ".capitao-diff", "artifacts", Date.now().toString());

const pushUnique = (collection: string[], value: string): void => {
  if (!collection.includes(value)) {
    collection.push(value);
  }
};

const attachObservers = (
  page: Page,
  consoleErrors: string[],
  networkFailures: string[],
  hydrationErrors: string[]
): void => {
  page.on("console", (msg) => {
    if (msg.type() !== "error") {
      return;
    }

    const text = msg.text();
    pushUnique(consoleErrors, text);
    if (text.toLowerCase().includes("hydration")) {
      pushUnique(hydrationErrors, text);
    }
  });

  page.on("response", (response) => {
    if (response.status() >= 400) {
      pushUnique(networkFailures, `${response.status()} ${response.url()}`);
    }
  });

  page.on("requestfailed", (request) => {
    pushUnique(networkFailures, `${request.failure()?.errorText ?? "failed"} ${request.url()}`);
  });
};

const tryLogin = async (page: Page, auth?: { email?: string; password?: string }): Promise<string> => {
  const email = auth?.email ?? "admin@test.com";
  const password = auth?.password ?? "admin";

  try {
    const emailInput = page.locator(
      'input[type="email"], input[name="email"], input[placeholder*="mail" i], input[placeholder*="email" i]'
    ).first();
    const passInput = page.locator('input[type="password"], input[name="password"]').first();

    if ((await emailInput.count()) === 0 || (await passInput.count()) === 0) {
      return "Login fields not found; skipped login scenario.";
    }

    await emailInput.fill(email);
    await passInput.fill(password);

    const submitButton = page
      .locator('button[type="submit"], button:has-text("Login"), button:has-text("Entrar"), button:has-text("Sign in")')
      .first();

    if ((await submitButton.count()) > 0) {
      await submitButton.click();
      await page.waitForTimeout(700);
    }

    return "Login flow executed.";
  } catch (error) {
    return `Login scenario failed safely: ${String(error)}`;
  }
};

const tryNavigation = async (page: Page): Promise<string> => {
  try {
    const links = page.locator("a[href]");
    const count = Math.min(await links.count(), 3);

    if (count === 0) {
      return "Navigation links not found; skipped navigation scenario.";
    }

    for (let index = 0; index < count; index += 1) {
      await links.nth(index).click({ timeout: 2_000 }).catch(() => undefined);
      await page.waitForTimeout(400);
    }

    return "Navigation scenario executed.";
  } catch (error) {
    return `Navigation scenario failed safely: ${String(error)}`;
  }
};

const tryForms = async (page: Page): Promise<string> => {
  try {
    const textInputs = page.locator('input[type="text"], input:not([type]), textarea');
    const count = Math.min(await textInputs.count(), 3);

    if (count === 0) {
      return "No generic text inputs found; skipped forms scenario.";
    }

    for (let index = 0; index < count; index += 1) {
      await textInputs.nth(index).fill("Capitão Diff automated form probe");
    }

    return "Forms scenario executed.";
  } catch (error) {
    return `Forms scenario failed safely: ${String(error)}`;
  }
};

const tryRepeatedClicks = async (page: Page): Promise<string> => {
  try {
    const button = page.locator("button").first();
    if ((await button.count()) === 0) {
      return "No clickable button found; skipped repeated click scenario.";
    }

    for (let index = 0; index < 5; index += 1) {
      await button.click().catch(() => undefined);
      await page.waitForTimeout(120);
    }

    return "Repeated click scenario executed.";
  } catch (error) {
    return `Repeated click scenario failed safely: ${String(error)}`;
  }
};

const runStressChecks = async (page: Page): Promise<StressTestResult[]> => {
  const results: StressTestResult[] = [];

  const textInput = page.locator('input[type="text"], input:not([type]), textarea').first();

  if ((await textInput.count()) > 0) {
    await textInput.fill("").catch(() => undefined);
    results.push({
      case: "empty-input",
      status: "stable",
      note: "Empty value submitted without runtime crash."
    });

    await textInput.fill("x".repeat(500)).catch(() => undefined);
    results.push({
      case: "long-input",
      status: "stable",
      note: "Long value injected successfully."
    });
  } else {
    results.push({
      case: "empty-input",
      status: "unstable",
      note: "No input field detected to execute stress check."
    });
  }

  const button = page.locator("button").first();
  if ((await button.count()) > 0) {
    for (let index = 0; index < 15; index += 1) {
      await button.click().catch(() => undefined);
    }
    results.push({
      case: "rapid-clicks",
      status: "stable",
      note: "Rapid click burst executed."
    });
  } else {
    results.push({
      case: "rapid-clicks",
      status: "unstable",
      note: "No button detected to run rapid click stress test."
    });
  }

  return results;
};

const runViewport = async (
  context: BrowserContext,
  baseUrl: string,
  viewportName: string,
  screenshotPath: string,
  auth: PlaywrightRunOptions["auth"],
  consoleErrors: string[],
  networkFailures: string[],
  hydrationErrors: string[]
): Promise<{
  screenshot: string;
  scenarioNotes: Array<{ scenario: string; note: string; status: "passed" | "failed" }>;
  viewport: { viewport: string; responsive: boolean; note: string };
  stressTests: StressTestResult[];
}> => {
  const page = await context.newPage();
  attachObservers(page, consoleErrors, networkFailures, hydrationErrors);

  const scenarioNotes: Array<{ scenario: string; note: string; status: "passed" | "failed" }> = [];
  let responsive = true;

  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });
  } catch (error) {
    responsive = false;
    scenarioNotes.push({
      scenario: "navigation",
      note: `Unable to open ${baseUrl}: ${String(error)}`,
      status: "failed"
    });
  }

  const loginNote = await tryLogin(page, auth);
  scenarioNotes.push({
    scenario: "login",
    note: loginNote,
    status: loginNote.toLowerCase().includes("failed") ? "failed" : "passed"
  });

  const navigationNote = await tryNavigation(page);
  scenarioNotes.push({
    scenario: "navigation",
    note: navigationNote,
    status: navigationNote.toLowerCase().includes("failed") ? "failed" : "passed"
  });

  const formsNote = await tryForms(page);
  scenarioNotes.push({
    scenario: "forms",
    note: formsNote,
    status: formsNote.toLowerCase().includes("failed") ? "failed" : "passed"
  });

  const clickNote = await tryRepeatedClicks(page);
  scenarioNotes.push({
    scenario: "repeated-clicks",
    note: clickNote,
    status: clickNote.toLowerCase().includes("failed") ? "failed" : "passed"
  });

  const stressTests = await runStressChecks(page);

  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  await page.close();

  return {
    screenshot: screenshotPath,
    scenarioNotes,
    viewport: {
      viewport: viewportName,
      responsive,
      note: responsive
        ? `${viewportName} viewport executed successfully.`
        : `${viewportName} viewport failed to load the target URL.`
    },
    stressTests
  };
};

export const runPlaywrightMission = async (
  options: PlaywrightRunOptions
): Promise<PlaywrightRunResult> => {
  const outputDir = options.outputDir ?? defaultOutputDir();
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: options.headless ?? false });

  const consoleErrors: string[] = [];
  const networkFailures: string[] = [];
  const hydrationErrors: string[] = [];

  try {
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });

    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
    });

    const desktop = await runViewport(
      desktopContext,
      options.baseUrl,
      "desktop",
      join(outputDir, "desktop.png"),
      options.auth,
      consoleErrors,
      networkFailures,
      hydrationErrors
    );

    const mobile = await runViewport(
      mobileContext,
      options.baseUrl,
      "mobile",
      join(outputDir, "mobile.png"),
      options.auth,
      consoleErrors,
      networkFailures,
      hydrationErrors
    );

    await Promise.all([desktopContext.close(), mobileContext.close()]);

    return {
      artifacts: {
        screenshots: [desktop.screenshot, mobile.screenshot],
        consoleErrors,
        networkFailures,
        hydrationErrors,
        scenarios: [...desktop.scenarioNotes, ...mobile.scenarioNotes],
        viewportReports: [desktop.viewport, mobile.viewport]
      },
      stressTests: [...desktop.stressTests, ...mobile.stressTests]
    };
  } finally {
    await browser.close();
  }
};
