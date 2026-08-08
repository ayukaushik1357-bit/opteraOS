import { useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandLockup } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

const links = [
  { label: "Platform", href: "#platform" },
  { label: "Features", href: "#features" },
  { label: "Automations", href: "#automations" },
  { label: "AI Assistant", href: "#ai" },
  { label: "Integrations", href: "#integrations" },
  { label: "Pricing", href: "#pricing" },
  { label: "Resources", href: "#faq" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6" aria-label="Main">
        <a href="#top" className="shrink-0"><BrandLockup /></a>

        <ul className="hidden items-center gap-6 lg:flex">
          {links.map((l) => (
            <li key={l.label}>
              <a href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
          <Button variant="ghost" size="sm">Log in</Button>
          <Button size="sm" className="bg-gradient-brand animate-sheen text-primary-foreground hover:opacity-90">
            Start Free
          </Button>
        </div>

        <button
          className="lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-border/60 bg-background/95 px-4 pb-4 lg:hidden">
          <ul className="grid gap-1 py-2">
            {links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">Log in</Button>
            <Button className="flex-1 bg-gradient-brand text-primary-foreground">Start Free</Button>
          </div>
        </div>
      )}
    </header>
  );
}