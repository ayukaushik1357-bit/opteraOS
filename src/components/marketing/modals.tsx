import { useState } from "react";
import { CheckCircle2, PlayCircle, Sparkles, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { paymentService, type BillingCycle } from "@/lib/payments/paymentService";

/** Drop the real product demo video URL here when it is ready. */
export const DEMO_VIDEO_URL = "";

const walkthrough = [
  { t: "Customer inquiry arrives", d: "A website form, WhatsApp message or call lands in opteraOS as a lead." },
  { t: "optera AI qualifies it", d: "The lead is scored, enriched and routed to the right salesperson automatically." },
  { t: "Sales, invoice, payment", d: "Deals become orders, orders become invoices, payments reconcile themselves." },
  { t: "The business updates itself", d: "Inventory, analytics and follow-ups all move without anyone re-keying data." },
];

export function DemoModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
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
          <div className="rounded-xl border border-border bg-secondary/30 p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <PlayCircle className="h-4 w-4 text-brand-cyan" aria-hidden />
              Product walkthrough
            </div>
            <ol className="mt-4 space-y-2">
              {walkthrough.map((s, i) => (
                <li key={s.t}>
                  <button
                    onClick={() => setStep(i)}
                    aria-current={step === i}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                      step === i ? "border-brand-indigo/60 bg-card" : "border-border hover:border-brand-violet/40"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-brand text-[11px] font-semibold text-primary-foreground">
                        {i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{s.t}</span>
                        {step === i && <span className="mt-1 block text-xs text-muted-foreground">{s.d}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-muted-foreground">
              A recorded product demo will play here once the walkthrough video is published.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CampaignModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-magenta" aria-hidden /> Proposed re-engagement campaign
          </DialogTitle>
          <DialogDescription>optera AI drafted this from your live business data.</DialogDescription>
        </DialogHeader>
        <dl className="grid gap-3 text-sm">
          {[
            ["Audience", "37 high-value customers · no purchase in 60+ days"],
            ["Channels", "WhatsApp, then email after 48 hours"],
            ["Offer", "10% loyalty credit on the next order"],
            ["Estimated opportunity", "₹4.8L"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4 rounded-xl border border-border bg-secondary/30 px-4 py-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          Preview only — campaign execution runs once automation backends are connected.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type CheckoutPlan = { id: string; name: string; amount: number | null; cycle: BillingCycle };

export function CheckoutModal({
  plan,
  onOpenChange,
}: {
  plan: CheckoutPlan | null;
  onOpenChange: (v: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function proceed() {
    if (!plan) return;
    setLoading(true);
    const res = await paymentService.startCheckout({
      planId: plan.id,
      planName: plan.name,
      cycle: plan.cycle,
      amount: plan.amount,
      currency: "INR",
    });
    setLoading(false);
    setResult(res.message);
  }

  return (
    <Dialog
      open={!!plan}
      onOpenChange={(v) => {
        if (!v) setResult(null);
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>You&apos;re selecting {plan?.name}</DialogTitle>
          <DialogDescription>Review your plan before continuing to payment.</DialogDescription>
        </DialogHeader>
        <dl className="grid gap-2 text-sm">
          <Row k="Plan" v={plan?.name ?? "—"} />
          <Row k="Billing" v={plan?.cycle === "yearly" ? "Yearly" : "Monthly"} />
          <Row
            k="Price"
            v={
              plan?.amount == null
                ? "Custom"
                : `₹${plan.amount.toLocaleString("en-IN")} / ${plan.cycle === "yearly" ? "year" : "month"}`
            }
          />
        </dl>
        {result && (
          <p className="rounded-xl border border-brand-indigo/40 bg-secondary/40 p-3 text-sm text-muted-foreground" role="status">
            {result}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={proceed}
            disabled={loading || !!result}
            className="bg-gradient-brand text-primary-foreground hover:opacity-90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            {result ? "Payment pending backend" : "Continue to Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-4 py-2.5">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
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
          {["Credentials are stored server-side, never in the browser", "Events sync both ways once enabled", "Every connection is scoped to your workspace"].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
