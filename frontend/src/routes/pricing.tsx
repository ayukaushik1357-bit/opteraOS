import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, CheckCircle2, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const title = "Direct Access — opteraOS";
const description = "opteraOS is fully open and directly accessible for all authenticated users without subscription paywalls.";

export const Route = createFileRoute("/pricing")({
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
  component: DirectAccessPage,
});

function DirectAccessPage() {
  return (
    <div className="min-h-screen text-[#0F2423] py-16 px-4 sm:px-6 lg:px-8 relative flex items-center justify-center">
      <div className="max-w-2xl mx-auto space-y-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,128,128,0.25)] bg-white/90 backdrop-blur-xs px-4 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#008080] shadow-teal-xs">
          <Sparkles className="h-3.5 w-3.5 text-[#008080]" />
          <span>Direct Product Access</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-[#0F2423] sm:text-4xl">
          opteraOS is Directly Accessible
        </h1>

        <p className="text-[#3D5A58] text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
          No subscriptions, no credit card paywalls. Simply sign in or create an organization to use the complete business operating system with Autopilot, CRM, Sales, and AI.
        </p>

        <div className="rounded-2xl border border-[rgba(0,128,128,0.18)] bg-white p-6 shadow-teal-xs text-left space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#008080]">
            <Shield className="h-4 w-4 text-[#008080]" /> All Enterprise Modules Unlocked
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#3D5A58]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#008080] shrink-0" />
              <span>Autonomous Autopilot Execution</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#008080] shrink-0" />
              <span>optera AI Copilot &amp; Tools</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#008080] shrink-0" />
              <span>Full CRM &amp; Sales Pipeline</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#008080] shrink-0" />
              <span>Invoicing, Quotes &amp; Orders</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link to="/dashboard">
            <Button className="w-full sm:w-auto bg-[#008080] hover:bg-[#006666] text-white font-semibold text-xs h-10 px-6 shadow-teal-xs gap-2">
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/auth">
            <Button variant="outline" className="w-full sm:w-auto border-[rgba(0,128,128,0.22)] bg-white text-xs font-semibold text-[#0F2423] hover:text-[#008080] hover:border-[#008080] h-10 px-6">
              Sign In / Switch Account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
