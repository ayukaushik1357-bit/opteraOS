import {
  Activity, BarChart3, Boxes, Building2, CheckCircle2, CreditCard, FileText,
  Fingerprint, GitBranch, Handshake, Layers, Lock, MessageSquare, Megaphone,
  Plug, Quote, ShieldCheck, Sparkles, Users, Workflow, Zap,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { CampaignModal, CheckoutModal, ConnectModal, type CheckoutPlan } from "@/components/marketing/modals";

export function SectionHeading({
  eyebrow, title, subtitle, align = "center",
}: { eyebrow?: string; title: ReactNode; subtitle?: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan">{eyebrow}</p>
      )}
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-pretty text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/* ---------------- Problem ---------------- */

const fragmented = ["CRM", "Invoices", "Payments", "Inventory", "Email", "WhatsApp", "Analytics", "Marketing", "Automation"];

export function ProblemSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <SectionHeading
        eyebrow="The problem"
        title="Your business shouldn't run across ten different tools."
        subtitle="Fragmented software means duplicated data, manual work and no single view of what is actually happening."
      />
      <div className="mt-14 grid items-center gap-10 lg:grid-cols-[1fr_auto_1fr]">
        <div className="grid grid-cols-3 gap-3">
          {fragmented.map((f, i) => (
            <div
              key={f}
              className="rounded-xl border border-border bg-secondary/30 px-3 py-4 text-center text-xs text-muted-foreground"
              style={{ transform: `rotate(${(i % 3) - 1}deg)` }}
            >
              {f}
            </div>
          ))}
        </div>
        <div className="mx-auto hidden h-px w-24 bg-gradient-brand lg:block" />
        <div className="glass glow-ring rounded-2xl p-8 text-center">
          <p className="text-2xl font-semibold tracking-tight">
            optera<span className="text-gradient">OS</span>
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            One business system. One source of truth. One intelligent operating layer.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Platform ---------------- */

const modules = [
  { icon: Users, name: "CRM", desc: "Manage leads, customers, contacts, activities and sales pipelines." },
  { icon: Handshake, name: "Sales", desc: "Track opportunities, deals, quotations, orders and revenue." },
  { icon: FileText, name: "Invoices", desc: "Create professional invoices and track payment status." },
  { icon: CreditCard, name: "Payments", desc: "Collect payments and manage subscription billing with Razorpay." },
  { icon: Boxes, name: "Inventory", desc: "Track products, stock levels, low-stock alerts and movements." },
  { icon: BarChart3, name: "Analytics", desc: "Understand revenue, sales, customers and product performance." },
  { icon: Megaphone, name: "Marketing", desc: "Campaigns, customer segments and automated follow-ups." },
  { icon: Workflow, name: "Automation", desc: "Visual workflows connecting business events, AI and services." },
  { icon: Sparkles, name: "AI Assistant", desc: "Ask about your business and let AI execute approved actions." },
];

export function PlatformSection() {
  return (
    <section id="platform" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <SectionHeading
        eyebrow="Core platform"
        title="Everything your business runs on, unified"
        subtitle="Nine deeply connected modules sharing one data model, one permission system and one AI context."
      />
      <div id="features" className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map(({ icon: Icon, name, desc }) => (
          <article
            key={name}
            className="group rounded-2xl border border-border bg-card/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-indigo/50 hover:shadow-[var(--shadow-glow)]"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand">
              <Icon className="h-5 w-5 text-primary-foreground" />
            </span>
            <h3 className="mt-4 font-semibold">{name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------------- AI Assistant ---------------- */

const prompts = [
  "Why did my revenue decrease this month?",
  "Show me customers who haven't purchased in 60 days.",
  "Which products are running low?",
  "How much revenue is still outstanding?",
];

export function AiSection() {
  const [active, setActive] = useState(0);
  const [campaign, setCampaign] = useState(false);

  return (
    <section id="ai" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading
            align="left"
            eyebrow="optera AI"
            title={<>Don&apos;t just see what happened. <span className="text-gradient">Act on it.</span></>}
            subtitle="optera AI understands your business data, explains performance, recommends the next action and executes it through controlled, permissioned tools."
          />
          <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
            {["Explains performance in plain language", "Grounded in your live business data", "Recommends a concrete next action", "Executes only after you approve"].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="glass rounded-2xl p-4 sm:p-6">
          <div className="flex flex-wrap gap-2">
            {prompts.map((p, i) => (
              <button
                key={p}
                onClick={() => setActive(i)}
                className={`rounded-full border px-3 py-1.5 text-left text-[11px] transition-colors ${
                  active === i
                    ? "border-transparent bg-gradient-brand text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-4">
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-secondary px-4 py-2.5 text-sm">
              {prompts[active]}
            </div>
            <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3 text-sm">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-magenta">
                <Sparkles className="h-3.5 w-3.5" /> optera AI
              </p>
              <p className="mt-2 leading-relaxed">
                Revenue is down 14% this month. The largest change is a 22% decrease in repeat purchases.
              </p>
              <div className="mt-3 rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
                37 high-value customers haven&apos;t purchased in 60+ days · ₹4.2L at risk
              </div>
              <div className="mt-3 grid gap-1 rounded-xl border border-border bg-card/60 p-3 text-xs">
                <p className="text-muted-foreground">
                  Estimated opportunity <span className="font-semibold text-foreground">₹4.8L</span>
                </p>
                <p className="text-muted-foreground">
                  Action <span className="font-medium text-foreground">Create re-engagement campaign</span>
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => setCampaign(true)}
                  className="bg-gradient-brand text-primary-foreground hover:opacity-90"
                >
                  Review Campaign
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/auth">Try optera AI</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CampaignModal open={campaign} onOpenChange={setCampaign} />
    </section>
  );
}

/* ---------------- Automation ---------------- */

const flow = [
  { step: "New lead", info: "A website form, WhatsApp message or call creates a lead record instantly." },
  { step: "AI qualification", info: "optera AI analyses the lead and assigns a priority score." },
  { step: "Lead score", info: "Scores above 70 are treated as sales-ready and fast-tracked." },
  { step: "Assign sales person", info: "Routed by territory, workload and past win rate." },
  { step: "Send WhatsApp", info: "A personalised opening message goes out within seconds." },
  { step: "Create follow-up", info: "A task with a due date lands in the owner's queue." },
  { step: "Update CRM", info: "Pipeline, activity timeline and analytics all update themselves." },
];

export function AutomationSection() {
  const [selected, setSelected] = useState(0);
  const node = flow[selected]!;
  return (
    <section id="automations" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <SectionHeading
        eyebrow="Automation engine"
        title="Build workflows visually. Let the system run itself."
        subtitle="Connect triggers, actions, logic and AI decisions on a visual canvas. Execution, retries and integrations are handled for you."
      />
      <div className="mt-14 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-border bg-card/50 p-5">
          {[
            { title: "Triggers", items: ["New Lead", "Order Created", "Payment Received", "Invoice Overdue", "Inventory Low", "Scheduled Time"] },
            { title: "Actions", items: ["Send Email", "Send WhatsApp", "Create Invoice", "Assign Employee", "Ask AI", "HTTP Request"] },
            { title: "Logic", items: ["IF / ELSE", "Filter", "Delay", "Approval", "AI Decision"] },
          ].map((group) => (
            <div key={group.title} className="mb-5 last:mb-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{group.title}</p>
              <ul className="mt-2 space-y-1.5">
                {group.items.map((i) => (
                  <li key={i} className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        <div className="glass grid-lines relative rounded-2xl p-6">
          <ol className="grid gap-3 sm:grid-cols-2">
            {flow.map((n, i) => (
              <li key={n.step}>
                <button
                  onClick={() => setSelected(i)}
                  onMouseEnter={() => setSelected(i)}
                  aria-pressed={selected === i}
                  className={`flex w-full items-center gap-3 rounded-xl border bg-card/70 px-4 py-3 text-left text-sm transition-colors ${
                    selected === i ? "border-brand-violet/70" : "border-border hover:border-brand-violet/60"
                  }`}
                >
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-brand text-[11px] font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="min-w-0 truncate">{n.step}</span>
                  <GitBranch className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-4" role="status" aria-live="polite">
            <p className="text-sm font-medium">{node.step}</p>
            <p className="mt-1 text-xs text-muted-foreground">{node.info}</p>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Runs on a managed execution layer with retries, logs and webhook integrations — no infrastructure to babysit.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Business workflow examples ---------------- */

const workflowExamples = [
  { icon: Users, title: "New lead", steps: ["Website inquiry", "AI qualification", "CRM update", "Personalised message", "Sales notification", "Follow-up"] },
  { icon: Boxes, title: "New order", steps: ["Order received", "Inventory updated", "Invoice generated", "Payment", "Customer confirmation", "Revenue updated"] },
  { icon: FileText, title: "Overdue invoice", steps: ["Invoice overdue", "Reminder", "Wait 3 days", "Second reminder", "Manager notification"] },
];

export function WorkflowExamplesSection() {
  return (
    <section id="workflows" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <SectionHeading
        eyebrow="In practice"
        title="What running itself actually looks like"
        subtitle="Three everyday business events, handled end to end without anyone re-keying data."
      />
      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {workflowExamples.map(({ icon: Icon, title, steps }) => (
          <article key={title} className="rounded-2xl border border-border bg-card/40 p-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand">
              <Icon className="h-5 w-5 text-primary-foreground" aria-hidden />
            </span>
            <h3 className="mt-4 font-semibold uppercase tracking-wide">{title}</h3>
            <ol className="mt-4 space-y-2">
              {steps.map((s, i) => (
                <li key={s} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
                  <span className="text-[11px] text-brand-cyan">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0">{s}</span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Differentiator ---------------- */

export function DifferentiatorSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <SectionHeading eyebrow="The difference" title="Traditional software reports. opteraOS operates." />
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card/40 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Traditional software</p>
          <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
            {["Data", "Dashboard", "User decides", "User acts"].map((s) => (
              <li key={s} className="rounded-lg border border-border px-3 py-2">{s}</li>
            ))}
          </ol>
        </div>
        <div className="glass glow-ring rounded-2xl p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-gradient">opteraOS</p>
          <ol className="mt-4 space-y-2 text-sm">
            {["Data", "AI understands", "AI recommends", "User approves", "Automation executes", "Business updates itself"].map((s) => (
              <li key={s} className="rounded-lg border border-border bg-secondary/30 px-3 py-2">{s}</li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Integrations ---------------- */

const integrations = [
  { icon: CreditCard, name: "Razorpay", cat: "Payments" },
  { icon: Workflow, name: "Automation engine", cat: "Automation" },
  { icon: MessageSquare, name: "WhatsApp", cat: "Communication" },
  { icon: Activity, name: "Email provider", cat: "Marketing" },
  { icon: Building2, name: "Google services", cat: "Productivity" },
  { icon: Plug, name: "Webhooks & REST", cat: "Developer" },
];

export function IntegrationsSection() {
  const [connect, setConnect] = useState<string | null>(null);
  return (
    <section id="integrations" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <SectionHeading
        eyebrow="Integrations"
        title="Connected to the tools you already use"
        subtitle="Connect payments, messaging, marketing and internal systems — then orchestrate them from one place."
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map(({ icon: Icon, name, cat }) => (
          <div key={name} className="flex items-center gap-4 rounded-2xl border border-border bg-card/50 p-5">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-secondary/40">
              <Icon className="h-5 w-5 text-brand-cyan" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">{cat}</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto shrink-0" onClick={() => setConnect(name)}>
              Connect
            </Button>
          </div>
        ))}
      </div>
      <ConnectModal name={connect} onOpenChange={(v) => !v && setConnect(null)} />
    </section>
  );
}

/* ---------------- Security ---------------- */

const security = [
  { icon: Lock, t: "Organization-level isolation", d: "Every record is scoped to an organization with enforced multi-tenant authorization." },
  { icon: Fingerprint, t: "Role-based access", d: "Owner, Admin, Manager, Employee and Viewer roles across every module." },
  { icon: ShieldCheck, t: "Verified payments", d: "Payment state is confirmed by signed webhooks on the backend, never the browser." },
  { icon: Layers, t: "Full audit trail", d: "Logins, record changes, automations and AI actions are all logged." },
];

export function SecuritySection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <SectionHeading eyebrow="Security" title="Enterprise-grade by default" />
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {security.map(({ icon: Icon, t, d }) => (
          <div key={t} className="rounded-2xl border border-border bg-card/40 p-6">
            <Icon className="h-5 w-5 text-brand-violet" />
            <h3 className="mt-3 font-medium">{t}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Pricing ---------------- */

const plans = [
  { id: "free", name: "Free", monthly: 0, yearly: 0, desc: "For getting started", features: ["1 organization", "Up to 250 customers", "CRM + invoices", "Community support"] },
  { id: "starter", name: "Starter", monthly: 1499, yearly: 14390, desc: "For small teams", features: ["5 users", "Sales + inventory", "10 automations", "Email support"] },
  { id: "growth", name: "Growth", monthly: 3999, yearly: 38390, desc: "Most popular", features: ["20 users", "optera AI assistant", "Unlimited automations", "Analytics suite"], featured: true },
  { id: "business", name: "Business", monthly: 8999, yearly: 86390, desc: "For scaling companies", features: ["Unlimited users", "AI actions & agents", "Advanced permissions", "Priority support"] },
  { id: "enterprise", name: "Enterprise", monthly: null, yearly: null, desc: "Custom deployment", features: ["SSO & SAML", "Dedicated support", "Custom integrations", "SLA"] },
];

export function PricingSection() {
  const [yearly, setYearly] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutPlan | null>(null);

  return (
    <section id="pricing" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <SectionHeading eyebrow="Pricing" title="Simple pricing that scales with you" />
      <div className="mt-8 flex items-center justify-center gap-3 text-sm">
        <span className={yearly ? "text-muted-foreground" : ""}>Monthly</span>
        <button
          role="switch"
          aria-checked={yearly}
          aria-label="Toggle yearly billing"
          onClick={() => setYearly((v) => !v)}
          className="relative h-6 w-11 rounded-full border border-border bg-secondary transition-colors"
        >
          <span
            className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-gradient-brand transition-all ${yearly ? "left-6" : "left-0.5"}`}
            style={{ height: 18, width: 18 }}
          />
        </button>
        <span className={yearly ? "" : "text-muted-foreground"}>
          Yearly <span className="text-brand-cyan">· Save 20%</span>
        </span>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`flex flex-col rounded-2xl border p-6 ${
              p.featured ? "glass glow-ring border-brand-indigo/50" : "border-border bg-card/40"
            }`}
          >
            <p className="font-medium">{p.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{p.desc}</p>
            <p className="mt-5 text-2xl font-semibold tracking-tight">
              {p.monthly === null ? "Custom" : `₹${(yearly ? p.yearly! : p.monthly).toLocaleString("en-IN")}`}
              {p.monthly !== null && (
                <span className="text-xs font-normal text-muted-foreground">/{yearly ? "yr" : "mo"}</span>
              )}
            </p>
            <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" />{f}
                </li>
              ))}
            </ul>
            {p.monthly === 0 ? (
              <Button asChild className="mt-6" variant={p.featured ? "default" : "outline"}>
                <Link to="/auth">Start Free</Link>
              </Button>
            ) : (
              <Button
                className={`mt-6 ${p.featured ? "bg-gradient-brand text-primary-foreground hover:opacity-90" : ""}`}
                variant={p.featured ? "default" : "outline"}
                onClick={() =>
                  setCheckout({
                    id: p.id,
                    name: p.name,
                    amount: p.monthly === null ? null : yearly ? p.yearly! : p.monthly,
                    cycle: yearly ? "yearly" : "monthly",
                  })
                }
              >
                {p.monthly === null ? "Contact sales" : `Choose ${p.name}`}
              </Button>
            )}
          </div>
        ))}
      </div>
      <CheckoutModal plan={checkout} onOpenChange={(v) => !v && setCheckout(null)} />
    </section>
  );
}

/* ---------------- Testimonials ---------------- */

const testimonials = [
  { q: "We replaced four tools in the first month. Everything finally lives in one place.", a: "Operations lead, retail group" },
  { q: "The AI flags overdue invoices before we notice them and drafts the follow-ups.", a: "Founder, services agency" },
  { q: "Our low-stock purchase workflow now runs entirely on its own.", a: "Director, distribution business" },
];

export function TestimonialsSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <SectionHeading eyebrow="Customers" title="Built for operators" />
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {testimonials.map((t) => (
          <figure key={t.a} className="rounded-2xl border border-border bg-card/40 p-6">
            <Quote className="h-5 w-5 text-brand-magenta" />
            <blockquote className="mt-3 text-sm leading-relaxed">{t.q}</blockquote>
            <figcaption className="mt-4 text-xs text-muted-foreground">{t.a}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */

const faqs = [
  { q: "What is opteraOS?", a: "opteraOS is an AI business operating system that unifies CRM, sales, invoicing, payments, inventory, marketing, analytics and automation in one platform." },
  { q: "How is opteraOS different from a CRM?", a: "A CRM records what happened. opteraOS runs the work: it connects every module to one data model, explains performance with AI and executes the next action automatically." },
  { q: "Can I connect Razorpay?", a: "Razorpay is on the integrations roadmap. Payment state will always be confirmed on the backend through verified webhook signatures, never in the browser." },
  { q: "Can I automate customer follow-ups?", a: "Yes. Build follow-up sequences visually with triggers, delays, conditions and AI decisions across WhatsApp and email." },
  { q: "Can optera AI perform actions?", a: "optera AI recommends a concrete next action and can execute approved actions through permissioned tools. High-impact actions always ask for your confirmation first." },
  { q: "Can I connect WhatsApp?", a: "WhatsApp is a first-class channel for lead responses, order confirmations and invoice reminders once messaging integrations are enabled." },
  { q: "Can I start for free?", a: "Yes. The Free plan covers one organization, up to 250 customers and the core CRM and invoicing modules — no card required." },
  { q: "Is my business data secure?", a: "Every record is scoped to your organization with role-based access, and all logins, record changes, automations and AI actions are logged." },
  { q: "When will integrations be available?", a: "Integrations roll out progressively as backend connections are enabled. You can explore each one in the app today and connect it when it goes live." },
];

export function FaqSection() {
  return (
    <section id="resources" className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
      <span id="faq" className="sr-only" />
      <SectionHeading eyebrow="FAQ" title="Questions, answered" />
      <Accordion type="single" collapsible className="mt-10">
        {faqs.map((f) => (
          <AccordionItem key={f.q} value={f.q}>
            <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

/* ---------------- Final CTA + Footer ---------------- */

export function FinalCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <div className="glass glow-ring aurora overflow-hidden rounded-3xl px-6 py-16 text-center sm:px-12">
        <Zap className="mx-auto h-6 w-6 text-brand-cyan" />
        <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Stop managing your business across disconnected tools.
        </h2>
        <p className="mt-4 text-muted-foreground">
          Start running your business with optera<span className="text-gradient font-medium">OS</span>.
        </p>
        <Button asChild size="lg" className="mt-8 bg-gradient-brand animate-sheen text-primary-foreground hover:opacity-90">
          <Link to="/auth">Start Free</Link>
        </Button>
      </div>
    </section>
  );
}

type FooterLink = { label: string; href?: string; to?: string };

const footerCols: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Platform", href: "#platform" },
      { label: "AI Assistant", href: "#ai" },
      { label: "Automations", href: "#automations" },
      { label: "Integrations", href: "#integrations" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", to: "/docs" },
      { label: "Help Center", to: "/help" },
      { label: "Templates", to: "/templates" },
      { label: "Blog", to: "/blog" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Contact", to: "/contact" },
      { label: "Careers", to: "/careers" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
      { label: "Security", to: "/security" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {footerCols.map((c) => (
            <div key={c.title}>
              <p className="text-sm font-medium">{c.title}</p>
              <ul className="mt-4 space-y-2">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.to ? (
                      <Link to={l.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                        {l.label}
                      </Link>
                    ) : (
                      <a href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-border/60 pt-8">
          <p className="text-lg font-semibold tracking-tight">optera<span className="text-gradient">OS</span></p>
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">AI Business Operating System</p>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-gradient">One system. Smarter business.</p>
        </div>
      </div>
    </footer>
  );
}