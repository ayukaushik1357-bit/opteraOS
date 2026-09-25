import { useState } from "react";
import { CheckCircle2, PlayCircle, Sparkles, Loader2, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Drop the real product demo video URL here when it is ready. */
export const DEMO_VIDEO_URL = "";

const walkthrough = [
  {
    t: "Customer inquiry arrives",
    d: "A website form, WhatsApp message or call lands in opteraOS as a lead.",
  },
  {
    t: "optera AI qualifies it",
    d: "The lead is scored, enriched and routed to the right salesperson automatically.",
  },
  {
    t: "Sales, invoice, payment",
    d: "Deals become orders, orders become invoices, payments reconcile themselves.",
  },
  {
    t: "The business updates itself",
    d: "Inventory, analytics and follow-ups all move without anyone re-keying data.",
  },
];

export function DemoModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [step, setStep] = useState(0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>See how opteraOS works</DialogTitle>
          <DialogDescription>From customer inquiry to automated business action.</DialogDescription>
        </DialogHeader>

        {DEMO_VIDEO_URL ? (
          <video
            className="aspect-video w-full rounded-xl border border-border bg-black"
            src={DEMO_VIDEO_URL}
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {walkthrough.map((w, i) => (
                <button
                  key={w.t}
                  type="button"
                  onClick={() => setStep(i)}
                  className={[
                    "flex-1 rounded-lg border px-2.5 py-1.5 text-left text-xs transition cursor-pointer",
                    i === step
                      ? "border-brand-indigo/60 bg-brand-indigo/10 text-foreground font-semibold"
                      : "border-border text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  Step {i + 1}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-cyan">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                <span>Automated step {step + 1} of 4</span>
              </div>
              <h3 className="mt-1 text-base font-semibold">{walkthrough[step]?.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{walkthrough[step]?.d}</p>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <span className="text-xs text-muted-foreground">Interactive walkthrough</span>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
                Previous
              </Button>
            )}
            {step < walkthrough.length - 1 ? (
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                Next
              </Button>
            ) : (
              <Button size="sm" onClick={() => onOpenChange(false)}>
                Get Started
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CampaignModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>AI Customer Reactivation Campaign</DialogTitle>
          <DialogDescription>
            optera AI drafted this from your live business data.
          </DialogDescription>
        </DialogHeader>
        <dl className="grid gap-3 text-sm">
          {[
            ["Audience", "37 high-value customers · no purchase in 60+ days"],
            ["Channels", "WhatsApp, then email after 48 hours"],
            ["Offer", "10% loyalty credit on the next order"],
            ["Estimated opportunity", "₹4.8L"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex items-start justify-between gap-4 rounded-xl border border-border bg-secondary/30 px-4 py-3"
            >
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          Preview only — campaign execution runs once automation backends are connected.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConnectModal({
  name,
  onOpenChange,
}: {
  name: string | null;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={!!name} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect {name}</DialogTitle>
          <DialogDescription>
            Connection setup will be available when backend integrations are connected.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {[
            "Credentials are stored server-side, never in the browser",
            "Events sync both ways once enabled",
            "Every connection is scoped to your workspace",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
