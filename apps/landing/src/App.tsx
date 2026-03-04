import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Radar, Blocks, Rocket, Copy, Check, Terminal } from "lucide-react";

import { availableLanguages, createTranslator, detectBrowserLanguage, type TranslationNamespace } from "@capitao-diff/i18n";
import type { SupportedLanguage } from "@capitao-diff/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const sectionMotion = {
  hidden: { opacity: 0, y: 32 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease: "easeOut"
    }
  }
} as const;

const useT = (language: SupportedLanguage, namespace: TranslationNamespace) => {
  return useMemo(() => createTranslator(language, namespace), [language, namespace]);
};

const LanguageSwitcher = ({ language, onChange }: { language: SupportedLanguage; onChange: (value: SupportedLanguage) => void }) => (
  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-slate-900/70 p-1 text-xs">
    {availableLanguages.map((code) => (
      <button
        key={code}
        type="button"
        className={`rounded-full px-3 py-1.5 font-semibold transition ${
          language === code ? "bg-cyan-500 text-slate-950" : "text-slate-300 hover:text-white"
        }`}
        onClick={() => onChange(code)}
      >
        {code.toUpperCase()}
      </button>
    ))}
  </div>
);

export default function App() {
  const [language, setLanguage] = useState<SupportedLanguage>(detectBrowserLanguage());
  const [copied, setCopied] = useState(false);

  const tCommon = useT(language, "common");
  const t = useT(language, "landing");
  const installCommand = t("install.command");
  const featureItems = [
    { icon: ShieldCheck, title: t("feature.1.title"), body: t("feature.1.body") },
    { icon: Radar, title: t("feature.2.title"), body: t("feature.2.body") },
    { icon: Blocks, title: t("feature.3.title"), body: t("feature.3.body") },
    { icon: Rocket, title: t("feature.4.title"), body: t("feature.4.body") }
  ];
  const installClients = [
    t("install.client.cursor"),
    t("install.client.codex"),
    t("install.client.claude"),
    t("install.client.windsurf"),
    t("install.client.opencode")
  ];

  const handleCopy = async (): Promise<void> => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="relative overflow-x-hidden pb-20">
      <div className="pointer-events-none absolute inset-0 grid-pattern" />

      <header className="sticky top-0 z-30 border-b border-cyan-500/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-medium text-cyan-300">{tCommon("brand.name")}</p>
            <p className="text-xs text-slate-400">{tCommon("brand.tagline")}</p>
          </div>
          <LanguageSwitcher language={language} onChange={setLanguage} />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 pt-16">
        <motion.section
          className="section-anchor grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={sectionMotion}
        >
          <div>
            <Badge>{t("hero.kicker")}</Badge>
            <h1 className="mt-6 text-4xl font-bold leading-tight text-white md:text-6xl">{t("hero.title")}</h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-300">{t("hero.subtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg">
                {t("hero.ctaPrimary")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="secondary">
                {t("hero.ctaSecondary")}
              </Button>
            </div>
          </div>

          <Card className="relative overflow-hidden">
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-cyan-500/20 blur-3xl" />
            <p className="text-xs uppercase tracking-widest text-cyan-300">{t("mission.title")}</p>
            <div className="mt-4 space-y-3 text-sm text-slate-200">
              <div className="rounded-lg border border-cyan-500/20 bg-slate-950/80 p-3">
                <p className="font-semibold">{t("mission.diff.title")}</p>
                <p className="text-slate-400">{t("mission.diff.body")}</p>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-950/80 p-3">
                <p className="font-semibold">{t("mission.playwright.title")}</p>
                <p className="text-slate-400">{t("mission.playwright.body")}</p>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-slate-950/80 p-3">
                <p className="font-semibold">{t("mission.report.title")}</p>
                <p className="text-slate-400">{t("mission.report.body")}</p>
              </div>
            </div>
          </Card>
        </motion.section>

        <motion.section
          className="section-anchor"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          variants={sectionMotion}
        >
          <Card className="relative overflow-hidden border-cyan-400/30 bg-slate-950/80 p-0">
            <div className="absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="border-b border-cyan-500/20 px-6 py-5">
              <h2 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">{t("install.title")}</h2>
              <p className="mt-3 max-w-3xl text-lg text-slate-300">{t("install.subtitle")}</p>
            </div>

            <div className="p-6">
              <div className="rounded-2xl border border-cyan-400/30 bg-black/55 shadow-[0_0_35px_rgba(34,197,94,0.15)]">
                <div className="flex items-center justify-between border-b border-cyan-500/20 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-cyan-200">
                    <Terminal className="h-4 w-4" />
                    <span>{t("install.caption")}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-400"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? t("install.copied") : t("install.copy")}
                  </button>
                </div>
                <div className="overflow-x-auto px-4 py-5">
                  <code className="font-mono text-sm text-emerald-300 md:text-base">$ {installCommand}</code>
                </div>
              </div>

              <p className="mt-5 text-center text-emerald-300">{t("install.ready")}</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="text-sm text-slate-400">{t("install.worksWith")}:</span>
                {installClients.map((client) => (
                  <span
                    key={client}
                    className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-300"
                  >
                    {client}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </motion.section>

        <motion.section
          className="section-anchor grid gap-6 md:grid-cols-2"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          variants={sectionMotion}
        >
          <Card>
            <h2 className="text-2xl font-semibold text-white">{t("problem.title")}</h2>
            <p className="mt-4 text-slate-300">{t("problem.body")}</p>
          </Card>
          <Card>
            <h2 className="text-2xl font-semibold text-white">{t("solution.title")}</h2>
            <p className="mt-4 text-slate-300">{t("solution.body")}</p>
          </Card>
        </motion.section>

        <motion.section
          className="section-anchor"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          variants={sectionMotion}
        >
          <h2 className="text-3xl font-semibold text-white">{t("how.title")}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[t("how.step1"), t("how.step2"), t("how.step3"), t("how.step4")].map((step, index) => (
              <Card key={step} className="min-h-40">
                <p className="text-sm font-semibold text-cyan-300">0{index + 1}</p>
                <p className="mt-4 text-slate-200">{step}</p>
              </Card>
            ))}
          </div>
        </motion.section>

        <motion.section
          className="section-anchor grid gap-4 lg:grid-cols-4"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={sectionMotion}
        >
          {featureItems.map((feature) => (
            <Card key={feature.title}>
              <feature.icon className="h-5 w-5 text-cyan-300" />
              <p className="mt-4 text-lg font-semibold text-white">{feature.title}</p>
              <p className="mt-2 text-sm text-slate-300">{feature.body}</p>
            </Card>
          ))}
        </motion.section>

        <motion.section
          className="section-anchor grid gap-6 md:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          variants={sectionMotion}
        >
          <Card>
            <h3 className="text-lg font-semibold text-white">{t("pricing.starter.name")}</h3>
            <p className="mt-1 text-3xl font-bold text-cyan-300">{t("pricing.starter.price")}</p>
            <p className="mt-4 text-slate-300">{t("pricing.starter.body")}</p>
          </Card>
          <Card className="border-cyan-300/40">
            <h3 className="text-lg font-semibold text-white">{t("pricing.squad.name")}</h3>
            <p className="mt-1 text-3xl font-bold text-cyan-300">{t("pricing.squad.price")}</p>
            <p className="mt-4 text-slate-300">{t("pricing.squad.body")}</p>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold text-white">{t("pricing.command.name")}</h3>
            <p className="mt-1 text-3xl font-bold text-cyan-300">{t("pricing.command.price")}</p>
            <p className="mt-4 text-slate-300">{t("pricing.command.body")}</p>
          </Card>
        </motion.section>

        <motion.section
          className="section-anchor grid gap-4 md:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          variants={sectionMotion}
        >
          {[t("testimonial.1"), t("testimonial.2"), t("testimonial.3")].map((text) => (
            <Card key={text} className="text-sm text-slate-200">
              {text}
            </Card>
          ))}
        </motion.section>

        <motion.section
          className="section-anchor"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          variants={sectionMotion}
        >
          <Card className="relative overflow-hidden border-cyan-300/30 bg-gradient-to-r from-cyan-500/20 to-teal-500/20">
            <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full bg-cyan-500/30 blur-3xl" />
            <h2 className="text-3xl font-semibold text-white">{t("cta.title")}</h2>
            <p className="mt-2 max-w-2xl text-slate-200">{tCommon("tone.approved")}</p>
            <Button className="mt-6" size="lg">
              {t("cta.button")}
            </Button>
          </Card>
        </motion.section>
      </main>
    </div>
  );
}
