import { useMemo, useState } from "react";
import { Activity, AlertTriangle, Camera, ShieldCheck } from "lucide-react";

import { availableLanguages, createTranslator, detectBrowserLanguage, type TranslationNamespace } from "@capitao-diff/i18n";
import type { SupportedLanguage } from "@capitao-diff/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const useT = (language: SupportedLanguage, namespace: TranslationNamespace) => {
  return useMemo(() => createTranslator(language, namespace), [language, namespace]);
};

const mockRuns = [
  {
    id: "run_901",
    status: "approved",
    score: 93,
    date: "2026-03-04T09:10:00Z",
    summaryKey: "run.1.summary"
  },
  {
    id: "run_900",
    status: "rejected",
    score: 61,
    date: "2026-03-03T14:38:00Z",
    summaryKey: "run.2.summary"
  },
  {
    id: "run_899",
    status: "approved",
    score: 87,
    date: "2026-03-02T21:20:00Z",
    summaryKey: "run.3.summary"
  }
];

const mockIssues = [
  {
    id: "iss_12",
    titleKey: "issue.1.title",
    severity: "high",
    status: "open"
  },
  {
    id: "iss_13",
    titleKey: "issue.2.title",
    severity: "medium",
    status: "in_progress"
  }
];

const screenshots = [
  { path: "artifacts/run_901/desktop.png", viewport: "desktop" },
  { path: "artifacts/run_901/mobile.png", viewport: "mobile" }
];

const LanguageSwitcher = ({ language, onChange }: { language: SupportedLanguage; onChange: (value: SupportedLanguage) => void }) => (
  <div className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white p-1">
    {availableLanguages.map((lang) => (
      <button
        key={lang}
        type="button"
        onClick={() => onChange(lang)}
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          language === lang ? "bg-sky-600 text-white" : "text-slate-500 hover:text-slate-900"
        }`}
      >
        {lang.toUpperCase()}
      </button>
    ))}
  </div>
);

const statusBadgeClass = (status: string): string => {
  if (status === "approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "rejected") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
};

export default function App() {
  const [language, setLanguage] = useState<SupportedLanguage>(detectBrowserLanguage());

  const t = useT(language, "dashboard");

  const approvedRate = `${Math.round((mockRuns.filter((run) => run.status === "approved").length / mockRuns.length) * 100)}%`;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Capitão Diff</h1>
          <p className="text-sm text-slate-500">{t("overview.subtitle")}</p>
        </div>
        <LanguageSwitcher language={language} onChange={setLanguage} />
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">{t("stats.projects")}</p>
          <p className="mt-2 text-3xl font-bold">4</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">{t("stats.runs")}</p>
          <p className="mt-2 text-3xl font-bold">{mockRuns.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">{t("stats.approvedRate")}</p>
          <p className="mt-2 text-3xl font-bold">{approvedRate}</p>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{t("runs.title")}</h2>
            <Button size="sm">{t("runs.sync")}</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-2 py-2">ID</th>
                  <th className="px-2 py-2">{t("runs.status")}</th>
                  <th className="px-2 py-2">{t("runs.score")}</th>
                  <th className="px-2 py-2">{t("runs.date")}</th>
                </tr>
              </thead>
              <tbody>
                {mockRuns.map((run) => (
                  <tr key={run.id} className="border-b border-slate-100">
                    <td className="px-2 py-3 font-medium text-slate-900">{run.id}</td>
                    <td className="px-2 py-3">
                      <Badge className={statusBadgeClass(run.status)}>{t(`status.${run.status}`)}</Badge>
                    </td>
                    <td className="px-2 py-3">{run.score}</td>
                    <td className="px-2 py-3">{new Date(run.date).toLocaleString(language === "pt" ? "pt-BR" : "en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">{t("issues.title")}</h2>
          <div className="mt-4 space-y-3">
            {mockIssues.map((issue) => (
              <div key={issue.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">{t(issue.titleKey)}</p>
                <div className="mt-2 flex gap-2">
                  <Badge className={statusBadgeClass(issue.status)}>{t(`status.${issue.status}`)}</Badge>
                  <Badge className="border-amber-200 bg-amber-50 text-amber-700">{t(`severity.${issue.severity}`)}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="flex items-center gap-2 text-slate-700">
            <ShieldCheck className="h-4 w-4" />
            <h3 className="font-semibold">{t("qaGate.title")}</h3>
          </div>
          <p className="mt-3 text-sm text-slate-600">{t("qaGate.body")}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-slate-700">
            <Activity className="h-4 w-4" />
            <h3 className="font-semibold">{t("console.title")}</h3>
          </div>
          <p className="mt-3 text-sm text-slate-600">{t("console.body")}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-slate-700">
            <AlertTriangle className="h-4 w-4" />
            <h3 className="font-semibold">{t("risk.title")}</h3>
          </div>
          <p className="mt-3 text-sm text-slate-600">{t("risk.body")}</p>
        </Card>
      </section>

      <section>
        <Card>
          <div className="mb-4 flex items-center gap-2 text-slate-800">
            <Camera className="h-4 w-4" />
            <h2 className="text-lg font-semibold">{t("screenshots.title")}</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {screenshots.map((item) => (
              <div key={item.path} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-800">{item.viewport}</p>
                <p className="mt-1 text-xs text-slate-500">{item.path}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
