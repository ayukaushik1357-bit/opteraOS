import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, PlayCircle, Sparkles, Shield, Zap, CheckCircle2, Layers } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Nav } from "@/components/marketing/Nav";
import { DashboardPreview } from "@/components/marketing/DashboardPreview";
import { DemoModal } from "@/components/marketing/modals";
import {
  AiSection,
  AnalyticsSection,
  DifferentiatorSection,
  FaqSection,
  FinalCta,
  Footer,
  IntegrationsSection,
  PlatformSection,
  PricingSection,
  ProblemSection,
  SecuritySection,
  TestimonialsSection,
} from "@/components/marketing/Sections";

const title = "opteraOS — AI Business Operating System";
const description =
  "opteraOS unifies CRM, sales pipelines, invoices, operational tasks, and autonomous automation in one intelligent platform. Run your business. Let AI handle the work.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Hero() {
  const [demo, setDemo] = useState(false);
  return (
    <section className="relative overflow-hidden bg-[#070913] pt-8 pb-16 sm:pt-14 sm:pb-24">
      {/* ── Ambient Background System ── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        {/* Subtle Tech Grid */}
        <div className="grid-lines absolute inset-0 opacity-40" />

        {/* Top Glow Orb */}
        <div
          className="absolute -top-40 left-1/2 h-[550px] w-[850px] -translate-x-1/2 rounded-full opacity-35 blur-[120px]"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(99, 102, 241, 0.4), rgba(168, 85, 247, 0.25), rgba(6, 182, 212, 0.15), transparent 70%)",
          }}
        />

        {/* Secondary Side Glows */}
        <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-cyan-600/10 blur-[100px]" />
        <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-purple-600/10 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        {/* ── Hero Typography & CTA Block ── */}
        <div className="mx-auto max-w-4xl text-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/40 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300 backdrop-blur-md shadow-lg shadow-indigo-500/10">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>AI Business Operating System</span>
          </div>

          {/* Main Headline */}
          <h1 className="mt-7 text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Run your business.
            <br />
            <span className="text-gradient animate-sheen">Let AI handle the work.</span>
          </h1>

          {/* Supporting Copy */}
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-300 sm:text-lg sm:leading-relaxed">
            opteraOS connects CRM, sales pipelines, invoices, payments, operational tasks, and
            autonomous workflow automation into a single intelligent platform.
          </p>

          {/* CTA Group */}
          <div className="mt-9 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="w-full bg-gradient-brand text-sm font-semibold text-white shadow-xl shadow-indigo-500/25 transition-all duration-300 hover:scale-[1.03] hover:opacity-95 sm:w-auto px-7 py-6"
            >
              <Link to="/auth">
                Start Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full border-white/15 bg-white/[0.04] text-sm font-medium text-white backdrop-blur-md transition-all duration-300 hover:bg-white/[0.09] hover:border-white/25 sm:w-auto px-6 py-6"
              onClick={() => setDemo(true)}
            >
              <PlayCircle className="mr-2 h-4 w-4 text-indigo-300" /> See How It Works
            </Button>
          </div>

          {/* Trust / Value Pills */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Unified CRM & Deals
            </span>
            <span className="hidden sm:inline-block text-slate-600">·</span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Autonomous Action Cards
            </span>
            <span className="hidden sm:inline-block text-slate-600">·</span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-cyan-400" /> Self-Healing Workflows
            </span>
            <span className="hidden sm:inline-block text-slate-600">·</span>
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-purple-400" /> Tenant RLS Isolation
            </span>
          </div>
        </div>

        {/* ── 3D Product Dashboard Visual ── */}
        <div className="mt-14 sm:mt-20">
          <DashboardPreview />
        </div>
      </div>

      <DemoModal open={demo} onOpenChange={setDemo} />
    </section>
  );
}

function Index() {
  return (
    <div id="top" className="dark min-h-screen bg-background text-foreground selection:bg-indigo-500/30 selection:text-white">
      <Nav />
      <main>
        <Hero />
        <ProblemSection />
        <PlatformSection />
        <AiSection />
        <DifferentiatorSection />
        <AnalyticsSection />
        <IntegrationsSection />
        <SecuritySection />
        <PricingSection />
        <TestimonialsSection />
        <FaqSection />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
