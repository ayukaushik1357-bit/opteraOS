import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Nav } from "@/components/marketing/Nav";
import { Footer } from "@/components/marketing/Sections";
import { Button } from "@/components/ui/button";

export function InfoPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: { heading: string; body: string }[];
}) {
  return (
    <div id="top" className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan">{eyebrow}</p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-4 text-pretty text-muted-foreground">{intro}</p>

        <div className="mt-12 space-y-6">
          {sections.map((s) => (
            <section key={s.heading} className="rounded-2xl border border-border bg-card/40 p-6">
              <h2 className="font-semibold">{s.heading}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" aria-hidden /> Back home</Link>
          </Button>
          <Button asChild className="bg-gradient-brand text-primary-foreground hover:opacity-90">
            <Link to="/auth">Start Free</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function infoHead(title: string, description: string) {
  const full = `${title} — opteraOS`;
  return () => ({
    meta: [
      { title: full },
      { name: "description", content: description },
      { property: "og:title", content: full },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  });
}
