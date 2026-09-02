import {
  Activity,
  BarChart3,
  Boxes,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Fingerprint,
  Handshake,
  Layers,
  Lock,
  MessageSquare,
  Megaphone,
  Plug,
  Quote,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CampaignModal, ConnectModal } from "@/components/marketing/modals";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="mt-4 text-pretty text-base text-[#4B5563] leading-relaxed">{subtitle}</p>}
    </div>
  );
}

/* ---------------- Problem ---------------- */

const fragmented = [
  "CRM",
  "Invoices",
  "Payments",
  "Inventory",
  "Email",
  "WhatsApp",
  "Analytics",
  "Marketing",
  "Automation",
];

export function ProblemSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="The problem"
        title="Your business shouldn't run across ten different tools."
        subtitle="Fragmented software means duplicated data, manual work and no single view of what is actually happening."
      />
      <div className="mt-14 grid items-center gap-8 lg:grid-cols-[1fr_auto_1fr]">
        <div className="grid grid-cols-3 gap-3">
          {fragmented.map((f, i) => (
            <div
              key={f}
              className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-4 text-center text-xs font-semibold text-[#4B5563] shadow-2xs"
              style={{ transform: `rotate(${(i % 3) - 1}deg)` }}
            >
              {f}
            </div>
          ))}
        </div>
        <div className="mx-auto hidden h-px w-24 bg-[#D1D5DB] lg:block" />
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center shadow-xs">
          <p className="text-2xl font-bold tracking-tight text-[#111827]">
            optera<span className="text-blue-600">OS</span>
          </p>
          <p className="mt-3 text-sm text-[#4B5563] leading-relaxed">
            One business system. One source of truth. One intelligent operating layer.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Platform ---------------- */

const modules = [
  {
    icon: Users,
    name: "CRM",
    desc: "Manage leads, customers, contacts, activities and sales pipelines.",
  },
  {
    icon: Handshake,
    name: "Sales",
    desc: "Track opportunities, deals, quotations, orders and revenue.",
  },
  {
    icon: FileText,
    name: "Invoices",
    desc: "Create professional invoices and track payment status.",
  },
  {
    icon: CreditCard,
    name: "Payments",
    desc: "Manage invoice receivables and automated collections.",
  },
  {
    icon: Boxes,
    name: "Inventory",
    desc: "Track products, stock levels, low-stock alerts and movements.",
  },
  {
    icon: BarChart3,
    name: "Analytics",
    desc: "Understand revenue, sales, customers and product performance.",
  },
  {
    icon: Megaphone,
    name: "Marketing",
    desc: "Campaigns, customer segments and automated follow-ups.",
  },
  {
    icon: Workflow,
    name: "Automation",
    desc: "Visual workflows connecting business events, AI and services.",
  },
  {
    icon: Sparkles,
    name: "AI Assistant",
    desc: "Ask about your business and let AI execute approved actions.",
  },
];

export function PlatformSection() {
  return (
    <section id="platform" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="Core platform"
        title="Everything your business runs on, unified"
        subtitle="Nine deeply connected modules sharing one data model, one permission system and one AI context."
      />
      <div id="features" className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map(({ icon: Icon, name, desc }) => (
          <article
            key={name}
            className="group rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-xs transition-all duration-150 hover:border-blue-300 hover:shadow-sm"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-base font-bold text-[#111827]">{name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#4B5563]">{desc}</p>
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
    <section id="ai" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading
            align="left"
            eyebrow="optera AI"
            title={
              <>
                Don&apos;t just see what happened. <span className="text-blue-600">Act on it.</span>
              </>
            }
            subtitle="optera AI understands your business data, explains performance, recommends the next action and executes it through controlled, permissioned tools."
          />
          <ul className="mt-8 space-y-3.5 text-sm font-medium text-[#374151]">
            {[
              "Explains performance in plain language",
              "Grounded in your live business data",
              "Recommends a concrete next action",
              "Executes only after you approve",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex flex-wrap gap-2">
            {prompts.map((p, i) => (
              <button
                key={p}
                onClick={() => setActive(i)}
                className={`rounded-full border px-3 py-1.5 text-left text-xs font-semibold transition-colors cursor-pointer ${
                  active === i
                    ? "border-blue-600 bg-blue-600 text-white shadow-2xs"
                    : "border-[#E5E7EB] bg-gray-50 text-[#4B5563] hover:text-[#111827] hover:bg-gray-100"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-4">
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-xs bg-blue-50 border border-blue-200 px-4 py-2.5 text-sm font-medium text-blue-900">
              {prompts[active]}
            </div>
            <div className="max-w-[95%] rounded-2xl rounded-bl-xs border border-[#E5E7EB] bg-white p-4 text-sm shadow-2xs">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700">
                <Sparkles className="h-3.5 w-3.5" /> optera AI
              </p>
              <p className="mt-2 text-sm text-[#111827] leading-relaxed">
                Revenue is down 14% this month. The largest change is a 22% decrease in repeat
                purchases from key manufacturing accounts.
              </p>
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
                37 high-value customers haven&apos;t purchased in 60+ days · ₹4.2L at risk
              </div>
              <div className="mt-3 grid gap-1 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3 text-xs">
                <p className="text-[#6B7280]">
                  Estimated opportunity <span className="font-bold text-[#111827]">₹4.8L</span>
                </p>
                <p className="text-[#6B7280]">
                  Recommended action{" "}
                  <span className="font-semibold text-[#111827]">Trigger re-engagement sequence</span>
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <Button
                  size="sm"
                  onClick={() => setCampaign(true)}
                  className="bg-blue-600 text-white hover:bg-blue-700 font-semibold text-xs shadow-xs"
                >
                  Review Campaign
                </Button>
                <Button asChild size="sm" variant="outline" className="text-xs font-medium">
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

/* ---------------- Differentiator ---------------- */

export function DifferentiatorSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="The difference"
        title="Traditional software reports. opteraOS operates."
      />
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
            Traditional software
          </p>
          <ol className="mt-4 space-y-2 text-sm text-[#4B5563]">
            {["Data recorded in silos", "Manual dashboard review", "User spends hours deciding", "User executes manually across tools"].map((s) => (
              <li key={s} className="rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2.5 font-medium">
                {s}
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-6 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">opteraOS</p>
          <ol className="mt-4 space-y-2 text-sm text-[#111827]">
            {[
              "Unified live operational data",
              "AI understands patterns & risks",
              "AI recommends actionable resolution",
              "Operator approves with 1 click",
              "Automation engine executes workflow",
              "Continuous business self-healing",
            ].map((s) => (
              <li key={s} className="rounded-lg border border-blue-200 bg-white px-3.5 py-2.5 font-semibold text-[#111827] shadow-2xs">
                {s}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Analytics ---------------- */

const analyticsHighlights = [
  { label: "Revenue MTD", value: "₹12.8L", delta: "+18.2% MoM" },
  { label: "Sales Orders", value: "1,248", delta: "+6.4% MoM" },
  { label: "New Customers", value: "312", delta: "+11.9% MoM" },
  { label: "Collections Rate", value: "94%", delta: "+3.1 pts" },
];

export function AnalyticsSection() {
  return (
    <section id="analytics" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="Analytics"
        title="One unified ledger everyone trusts"
        subtitle="Revenue, sales, customers, orders, invoices and inventory all read from the same source of truth."
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {analyticsHighlights.map((h) => (
          <div key={h.label} className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">{h.label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[#111827]">{h.value}</p>
            <p className="mt-1 text-xs font-semibold text-green-700">{h.delta}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: BarChart3,
            t: "Real-time dashboards",
            d: "Every module reports into shared dashboards, refreshed automatically as events occur.",
          },
          {
            icon: Activity,
            t: "Cohorts & retention",
            d: "Track customer repeat rates, identify churn signals, and monitor account velocity.",
          },
          {
            icon: Sparkles,
            t: "AI explanations",
            d: "Ask why a metric moved and get an instant explanation grounded in your transaction data.",
          },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-xs">
            <Icon className="h-5 w-5 text-blue-600" aria-hidden />
            <h3 className="mt-3 text-base font-bold text-[#111827]">{t}</h3>
            <p className="mt-2 text-sm text-[#4B5563] leading-relaxed">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Integrations ---------------- */

const integrations = [
  { icon: CreditCard, name: "Invoicing & Billing", cat: "Finance" },
  { icon: Workflow, name: "Automation Engine", cat: "Automation" },
  { icon: MessageSquare, name: "WhatsApp Business", cat: "Communication" },
  { icon: Activity, name: "Email SMTP & Webhooks", cat: "Marketing" },
  { icon: Building2, name: "Google Workspace", cat: "Productivity" },
  { icon: Plug, name: "Custom Webhooks & REST", cat: "Developer" },
];

export function IntegrationsSection() {
  const [connect, setConnect] = useState<string | null>(null);
  return (
    <section id="integrations" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="Integrations"
        title="Connected to your operational stack"
        subtitle="Connect payments, messaging, marketing and internal systems — then orchestrate them from one place."
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map(({ icon: Icon, name, cat }) => (
          <div
            key={name}
            className="flex items-center gap-4 rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] text-blue-600">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#111827]">{name}</p>
              <p className="text-xs text-[#6B7280]">{cat}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto shrink-0 text-xs font-semibold border-[#D1D5DB]"
              onClick={() => setConnect(name)}
            >
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
  {
    icon: Lock,
    t: "Secure Workspace Isolation",
    d: "Every record is strictly scoped to an organization with PostgreSQL Row Level Security.",
  },
  {
    icon: Fingerprint,
    t: "Role-Based Access Control",
    d: "Fine-grained permissions for Owner, Admin, Manager, Member, and Viewer across all modules.",
  },
  {
    icon: ShieldCheck,
    t: "Cryptographically Verified Webhooks",
    d: "Payment and automation states are verified via signed HMAC webhooks on the server.",
  },
  {
    icon: Layers,
    t: "Immutable Audit Trail",
    d: "Logins, critical data mutations, automation executions, and AI actions are logged.",
  },
];

export function SecuritySection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <SectionHeading eyebrow="Security" title="Enterprise security by architecture" />
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {security.map(({ icon: Icon, t, d }) => (
          <div key={t} className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-xs">
            <Icon className="h-5 w-5 text-blue-600" />
            <h3 className="mt-3 text-base font-bold text-[#111827]">{t}</h3>
            <p className="mt-2 text-sm text-[#4B5563] leading-relaxed">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Pricing ---------------- */

const plans = [
  {
    id: "free",
    name: "Free",
    monthly: 0,
    yearly: 0,
    desc: "For getting started",
    features: ["1 organization", "Up to 250 customers", "CRM + invoices", "Standard support"],
  },
  {
    id: "starter",
    name: "Starter",
    monthly: 1499,
    yearly: 14390,
    desc: "For small teams",
    features: ["5 users", "Sales + inventory", "10 automations", "Email support"],
  },
  {
    id: "growth",
    name: "Growth",
    monthly: 3999,
    yearly: 38390,
    desc: "Most popular",
    features: ["20 users", "optera AI assistant", "Unlimited automations", "Full analytics suite"],
    featured: true,
  },
  {
    id: "business",
    name: "Business",
    monthly: 8999,
    yearly: 86390,
    desc: "For scaling companies",
    features: [
      "Unlimited users",
      "AI actions & agents",
      "Advanced permissions",
      "Priority SLA support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthly: null,
    yearly: null,
    desc: "Custom deployment",
    features: ["SSO & SAML", "Dedicated account manager", "Custom integrations", "99.9% uptime SLA"],
  },
];

export function PricingSection({ id }: { id?: string }) {
  const capabilities = [
    { name: "Autonomous Autopilot", desc: "Background CRM qualification, followup triggers, and task assignment.", featured: false },
    { name: "optera AI Copilot", desc: "Natural language query engine over unified business database records.", featured: true },
    { name: "Unified CRM & Sales", desc: "Leads, deals pipeline, customer histories, and team collaboration.", featured: false },
    { name: "Financial Invoicing", desc: "Automated tax calculation, PDF invoice rendering, and balance tracking.", featured: false },
  ];

  return (
    <section id={id} className="container mx-auto px-4 py-20">
      <SectionHeading eyebrow="Access" title="Direct Enterprise Platform Access" subtitle="opteraOS is fully open and directly accessible for your business without subscription paywalls." />

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {capabilities.map((c) => (
          <div
            key={c.name}
            className={`flex flex-col justify-between rounded-2xl border p-6 bg-white ${
              c.featured
                ? "border-blue-600 ring-2 ring-blue-600 shadow-md relative"
                : "border-[#E5E7EB] shadow-xs"
            }`}
          >
            {c.featured && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
                Core AI
              </span>
            )}
            <div>
              <p className="font-bold text-[#111827] text-base">{c.name}</p>
              <p className="mt-2 text-xs text-[#6B7280] leading-relaxed">{c.desc}</p>
            </div>
            <Button asChild className="mt-6 w-full text-xs" variant={c.featured ? "default" : "outline"}>
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Testimonials ---------------- */

const testimonials = [
  {
    q: "We replaced four different tools in our first month. Everything finally lives in one clear source of truth.",
    a: "Operations Lead, Apex Logistics Group",
  },
  {
    q: "The autonomous reminders reduced our average accounts receivable turnaround from 28 days to 11 days.",
    a: "Finance Director, Crestline Services",
  },
  {
    q: "Inventory balancing and sales order creation now run seamlessly without manual handoffs.",
    a: "Managing Director, Bharat Distribution Hub",
  },
];

export function TestimonialsSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <SectionHeading eyebrow="Customers" title="Built for modern operators" />
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {testimonials.map((t) => (
          <figure key={t.a} className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-xs">
            <Quote className="h-5 w-5 text-blue-600" />
            <blockquote className="mt-3 text-sm text-[#111827] leading-relaxed font-medium">{t.q}</blockquote>
            <figcaption className="mt-4 text-xs font-semibold text-[#6B7280]">{t.a}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */

const faqs = [
  {
    q: "What is opteraOS?",
    a: "opteraOS is an AI business operating system that unifies CRM, sales, invoicing, payments, inventory, marketing, analytics and workflow automation in one platform.",
  },
  {
    q: "How is opteraOS different from a traditional CRM?",
    a: "A traditional CRM only records history. opteraOS actively runs the work: it unifies all business data into one model, explains performance with AI, and triggers automated execution upon approval.",
  },
  {
    q: "Can I connect custom webhooks?",
    a: "Yes. Payment reconciliation and subscriptions are supported, with payment states verified cryptographically on the backend via webhook signatures.",
  },
  {
    q: "Can I automate customer follow-ups?",
    a: "Yes. Build multi-step follow-up sequences with triggers, delays, conditions, and autonomous AI recommendations across email and WhatsApp.",
  },
  {
    q: "Can optera AI execute actions?",
    a: "optera AI suggests next steps and executes authorized actions through permissioned tools. High-impact operations always require your confirmation.",
  },
  {
    q: "Is multi-tenant business data isolated?",
    a: "Yes. Every record is scoped to your organization with strict PostgreSQL Row Level Security and role-based access control.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
      <Accordion type="single" collapsible className="mt-10 divide-y divide-[#E5E7EB] border-y border-[#E5E7EB]">
        {faqs.map((f) => (
          <AccordionItem key={f.q} value={f.q} className="border-none py-2">
            <AccordionTrigger className="text-left text-sm font-bold text-[#111827] hover:text-blue-600">{f.q}</AccordionTrigger>
            <AccordionContent className="text-sm text-[#4B5563] leading-relaxed">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

/* ---------------- Final CTA + Footer ---------------- */

export function FinalCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="rounded-2xl border border-blue-200 bg-blue-50/60 px-6 py-16 text-center sm:px-12 shadow-xs">
        <Zap className="mx-auto h-7 w-7 text-blue-600" />
        <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
          Stop managing your business across disconnected tools.
        </h2>
        <p className="mt-4 text-base text-[#4B5563] max-w-xl mx-auto">
          Unify your CRM, pipelines, invoices, and automations into a single intelligent platform.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-8 py-3 h-12 shadow-xs"
        >
          <Link to="/auth">Start Free Today</Link>
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
      { label: "AI Copilot", href: "#ai" },
      { label: "CRM & Sales", href: "#features" },
      { label: "Integrations", href: "#integrations" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "#" },
      { label: "Help Center", href: "#" },
      { label: "Templates", href: "#" },
      { label: "API Reference", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About opteraOS", href: "#" },
      { label: "Security & Trust", href: "#" },
      { label: "Contact Support", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Security Whitepaper", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-[#E5E7EB] bg-white text-[#374151]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {footerCols.map((c) => (
            <div key={c.title}>
              <p className="text-xs font-bold uppercase tracking-wider text-[#111827]">{c.title}</p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href || "#"}
                      className="text-sm text-[#4B5563] transition-colors hover:text-[#111827]"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-[#E5E7EB] pt-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-base font-bold tracking-tight text-[#111827]">
              optera<span className="text-blue-600">OS</span>
            </p>
            <p className="mt-1 text-xs text-[#6B7280]">
              © 2026 opteraOS. All rights reserved. Enterprise AI Business Operating System.
            </p>
          </div>
          <p className="text-xs font-medium text-[#6B7280]">
            Engineered for high-reliability enterprise operations.
          </p>
        </div>
      </div>
    </footer>
  );
}
