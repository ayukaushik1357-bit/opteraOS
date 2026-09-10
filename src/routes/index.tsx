import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, PlayCircle, Sparkles, Shield, Zap, CheckCircle2, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
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
import { useTheme } from "@/hooks/use-theme";

const title = "opteraOS — AI Business Operating System";
const description =
  "opteraOS unifies CRM, sales pipelines, invoices, payments, operational tasks, and autonomous automation in one intelligent platform. Run your business. Let AI handle the work.";

export const Route = createFileRoute("/")((({
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
})));

function Hero() {
  const [demo, setDemo] = useState(false);
  const { isDark } = useTheme();

  return (
    <section id="top" className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
      {/* ── Ambient background glows ── */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      >
        {/* Top-left teal glow */}
        <div className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-[#008080] opacity-[0.07] blur-[120px] dark:opacity-[0.18]" />
        {/* Top-right cyan glow */}
        <div className="absolute -top-20 right-0 h-[500px] w-[500px] rounded-full bg-[#22D3EE] opacity-[0.06] blur-[100px] dark:opacity-[0.10]" />
        {/* Center-bottom violet glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-[#8B5CF6] opacity-[0.05] blur-[100px] dark:opacity-[0.10]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07]"
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
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,128,128,0.25)] dark:border-teal-500/35 bg-[rgba(0,128,128,0.08)] dark:bg-teal-950/50 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#006666] dark:text-teal-300">
            <span className="flex h-2 w-2 rounded-full bg-[#008080] dark:bg-teal-400 animate-pulse shadow-[0_0_6px_#008080] dark:shadow-[0_0_6px_#00b3b3]" />
            <span>AI Business Operating System</span>
          </div>

          {/* Main Headline */}
          <h1 className="mt-7 text-balance text-4xl font-bold tracking-tight text-[#0F2423] dark:text-white sm:text-5xl lg:text-[64px] lg:leading-[1.06]">
            Run your business.
            <br />
            <span className="text-gradient">Let AI handle the work.</span>
          </h1>

          {/* Supporting Copy */}
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-[#3D5A58] dark:text-teal-100/80 sm:text-lg sm:leading-relaxed font-medium">
            opteraOS connects CRM, sales pipelines, invoices, payments, operational tasks, and
            autonomous workflow automation into a single intelligent platform.
          </p>

          {/* CTA Group */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="w-full bg-gradient-to-r from-[#008080] to-[#0D9488] hover:from-[#006666] hover:to-[#008080] text-white text-sm font-semibold shadow-[0_4px_20px_rgba(0,128,128,0.3)] dark:shadow-[0_4px_28px_rgba(0,179,179,0.4)] border-0 sm:w-auto px-8 py-3 h-12 rounded-xl transition-all duration-200"
            >
              <Link to="/auth">
                Start Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full text-sm font-semibold text-[#0F2423] dark:text-white border-[rgba(0,128,128,0.25)] dark:border-teal-500/35 bg-white/80 dark:bg-teal-950/30 hover:bg-[rgba(0,128,128,0.08)] dark:hover:bg-teal-900/30 hover:text-[#008080] dark:hover:text-teal-300 hover:border-[#008080] dark:hover:border-teal-400/60 shadow-sm backdrop-blur-sm sm:w-auto px-6 py-3 h-12 rounded-xl transition-all duration-200"
              onClick={() => setDemo(true)}
            >
              <PlayCircle className="mr-2 h-4 w-4 text-[#008080] dark:text-teal-400" /> See How It Works
            </Button>
          </div>

          {/* Trust Pills */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[13px] font-medium text-[#5A7573] dark:text-teal-100/75">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#059669] dark:text-emerald-400 shrink-0" />
              <span className="text-[#3D5A58] dark:text-teal-100/85">Unified CRM & Deals</span>
            </span>
            <span className="hidden sm:inline-block text-[rgba(0,128,128,0.3)] dark:text-teal-600/50">·</span>
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#008080] dark:text-teal-400 shrink-0" />
              <span className="text-[#3D5A58] dark:text-teal-100/85">Autonomous Action Cards</span>
            </span>
            <span className="hidden sm:inline-block text-[rgba(0,128,128,0.3)] dark:text-teal-600/50">·</span>
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#D97706] dark:text-amber-400 shrink-0" />
              <span className="text-[#3D5A58] dark:text-teal-100/85">Self-Healing Workflows</span>
            </span>
            <span className="hidden sm:inline-block text-[rgba(0,128,128,0.3)] dark:text-teal-600/50">·</span>
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#6366F1] dark:text-indigo-400 shrink-0" />
              <span className="text-[#3D5A58] dark:text-teal-100/85">Secure Workspace Isolation</span>
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

/**
 * Floating sticky theme toggle — visible while scrolling all landing sections.
 * Positioned bottom-right, always on top of content.
 * Slides up after user scrolls 180px.
 */
function FloatingThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 180);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={[
        "fixed bottom-8 right-6 z-[9999] flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold shadow-xl border transition-all duration-500 cursor-pointer select-none",
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none",
        isDark
          ? "bg-[#091b1f] border-teal-500/40 text-teal-300 hover:bg-[#0c2429] hover:border-teal-400/60 shadow-[0_0_20px_rgba(0,179,179,0.25)]"
          : "bg-white border-[rgba(0,128,128,0.25)] text-[#006666] hover:bg-[rgba(0,128,128,0.06)] hover:border-[#008080] shadow-[0_4px_20px_rgba(0,128,128,0.2)]",
      ].join(" ")}
    >
      {isDark ? (
        <Sun className="h-3.5 w-3.5 text-amber-400" />
      ) : (
        <Moon className="h-3.5 w-3.5 text-[#008080]" />
      )}
      <span>{isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}

function Index() {
  // Initialize theme on landing page mount
  useTheme();

  return (
    <div id="top" className="min-h-screen text-foreground transition-colors duration-300">
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
      {/* Floating theme toggle — always visible while scrolling sections */}
      <FloatingThemeToggle />
    </div>
  );
}
