import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, PlayCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Nav } from "@/components/marketing/Nav";
import { DashboardPreview } from "@/components/marketing/DashboardPreview";
import { DemoModal } from "@/components/marketing/modals";
import {
  AiSection,
  AnalyticsSection,
  AutomationSection,
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
  WorkflowExamplesSection,
} from "@/components/marketing/Sections";

const title = "opteraOS — AI Business Operating System";
const description =
  "opteraOS unifies CRM, sales, invoices, payments, inventory, analytics and AI automation in one intelligent platform. One system. Smarter business.";

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
    <section className="aurora relative overflow-hidden">
      <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden />
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-brand" />
            AI-powered business operating system
          </span>
          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Run your entire business.
            <br />
            <span className="text-gradient animate-sheen">Intelligently.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            One platform for CRM, sales, invoices, inventory, analytics, AI and automation.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full bg-gradient-brand animate-sheen text-primary-foreground hover:opacity-90 sm:w-auto">
              <Link to="/auth">Start Free <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={() => setDemo(true)}>
              <PlayCircle className="mr-1 h-4 w-4" /> See How It Works
            </Button>
          </div>
        </div>

        <div className="float-soft mt-16">
          <DashboardPreview />
        </div>
      </div>
      <DemoModal open={demo} onOpenChange={setDemo} />
    </section>
  );
}

function Index() {
  return (
    <div id="top" className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <ProblemSection />
        <PlatformSection />
        <AiSection />
        <AutomationSection />
        <WorkflowExamplesSection />
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
