import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, PlayCircle, Sparkles, Shield, Zap, CheckCircle2 } from "lucide-react";
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

export const Route = createFileRoute("/")(({
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
}));

function Hero() {
  const [demo, setDemo] = useState(false);
  return (
    <section id="top" className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
      {/* ── Ambient background glows ── */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      >
        {/* Top-left teal glow */}
        <div className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-[#008080] opacity-[0.07] blur-[120px]" />
        {/* Top-right cyan glow */}
        <div className="absolute -top-20 right-0 h-[500px] w-[500px] rounded-full bg-[#22D3EE] opacity-[0.06] blur-[100px]" />
        {/* Center-bottom violet glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-[#8B5CF6] opacity-[0.05] blur-[100px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,128,128,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,128,128,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        {/* ── Hero Typography & CTA Block ── */}
        <div className="mx-auto max-w-4xl text-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,128,128,0.25)] bg-[rgba(0,128,128,0.08)] backdrop-blur-sm px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#006666]">
            <span className="flex h-2 w-2 rounded-full bg-[#008080] animate-pulse shadow-[0_0_6px_#008080]" />
            <span>AI Business Operating System</span>
          </div>

          {/* Main Headline */}
          <h1 className="mt-7 text-balance text-4xl font-bold tracking-tight text-[#0F2423] sm:text-5xl lg:text-[64px] lg:leading-[1.06]">
            Run your business.
            <br />
            <span className="text-gradient">Let AI handle the work.</span>
          </h1>

          {/* Supporting Copy */}
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-[#3D5A58] sm:text-lg sm:leading-relaxed font-medium">
            opteraOS connects CRM, sales pipelines, invoices, payments, operational tasks, and
            autonomous workflow automation into a single intelligent platform.
          </p>

          {/* CTA Group */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="w-full bg-gradient-to-r from-[#008080] to-[#0D9488] hover:from-[#006666] hover:to-[#008080] text-white text-sm font-semibold shadow-[0_4px_20px_rgba(0,128,128,0.3)] border-0 sm:w-auto px-8 py-3 h-12 rounded-xl transition-all duration-200"
            >
              <Link to="/auth">
                Start Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full text-sm font-semibold text-[#0F2423] border-[rgba(0,128,128,0.25)] bg-white/80 hover:bg-[rgba(0,128,128,0.08)] hover:text-[#008080] hover:border-[#008080] shadow-sm backdrop-blur-sm sm:w-auto px-6 py-3 h-12 rounded-xl transition-all duration-200"
              onClick={() => setDemo(true)}
            >
              <PlayCircle className="mr-2 h-4 w-4 text-[#008080]" /> See How It Works
            </Button>
          </div>

          {/* Trust Pills */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[13px] font-medium text-[#5A7573]">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#059669] shrink-0" />
              <span className="text-[#3D5A58]">Unified CRM & Deals</span>
            </span>
            <span className="hidden sm:inline-block text-[rgba(0,128,128,0.3)]">·</span>
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#008080] shrink-0" />
              <span className="text-[#3D5A58]">Autonomous Action Cards</span>
            </span>
            <span className="hidden sm:inline-block text-[rgba(0,128,128,0.3)]">·</span>
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#D97706] shrink-0" />
              <span className="text-[#3D5A58]">Self-Healing Workflows</span>
            </span>
            <span className="hidden sm:inline-block text-[rgba(0,128,128,0.3)]">·</span>
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#6366F1] shrink-0" />
              <span className="text-[#3D5A58]">Secure Workspace Isolation</span>
            </span>
          </div>
        </div>

        {/* ── Product Dashboard Visual ── */}
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
    <div id="top" className="min-h-screen text-[#F0F6FF]">
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
