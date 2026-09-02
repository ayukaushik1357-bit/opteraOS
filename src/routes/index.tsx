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
    <section id="top" className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-24">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        {/* ── Hero Typography & CTA Block ── */}
        <div className="mx-auto max-w-4xl text-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/80 backdrop-blur-xs px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-blue-700 shadow-2xs">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span>AI Business Operating System</span>
          </div>

          {/* Main Headline */}
          <h1 className="mt-7 text-balance text-4xl font-bold tracking-tight text-[#111827] sm:text-5xl lg:text-[62px] lg:leading-[1.08]">
            Run your business.
            <br />
            <span className="text-gradient">Let AI handle the work.</span>
          </h1>

          {/* Supporting Copy */}
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-[#4B5563] sm:text-lg sm:leading-relaxed">
            opteraOS connects CRM, sales pipelines, invoices, payments, operational tasks, and
            autonomous workflow automation into a single intelligent platform.
          </p>

          {/* CTA Group */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="w-full bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white shadow-xs transition-all duration-150 sm:w-auto px-7 py-3 h-12 rounded-lg"
            >
              <Link to="/auth">
                Start Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full text-sm font-semibold text-[#374151] border-[#CBD5E1] bg-white hover:bg-gray-50 hover:text-[#111827] sm:w-auto px-6 py-3 h-12 rounded-lg shadow-xs"
              onClick={() => setDemo(true)}
            >
              <PlayCircle className="mr-2 h-4 w-4 text-blue-600" /> See How It Works
            </Button>
          </div>

          {/* Trust / Value Pills */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[13.5px] font-medium text-[#4B5563]">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /> Unified CRM &amp; Deals
            </span>
            <span className="hidden sm:inline-block text-gray-300">·</span>
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600 shrink-0" /> Autonomous Action Cards
            </span>
            <span className="hidden sm:inline-block text-gray-300">·</span>
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-600 shrink-0" /> Self-Healing Workflows
            </span>
            <span className="hidden sm:inline-block text-gray-300">·</span>
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-600 shrink-0" /> Secure Workspace Isolation
            </span>
          </div>
        </div>

        {/* ── Product Dashboard Visual ── */}
        <div className="mt-12 sm:mt-16">
          <DashboardPreview />
        </div>
      </div>

      <DemoModal open={demo} onOpenChange={setDemo} />
    </section>
  );
}

function Index() {
  return (
    <div id="top" className="min-h-screen text-[#111827]">
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
