import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, ArrowRight, Zap } from "lucide-react";
import { BrandLockup } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const links = [
  { label: "Platform", href: "#platform" },
  { label: "AI Copilot", href: "#ai" },
  { label: "CRM & Finance", href: "#features" },
  { label: "Integrations", href: "#integrations" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session));

    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-[rgba(0,128,128,0.14)] shadow-[0_4px_24px_rgba(0,64,64,0.06)]"
          : "bg-transparent border-b border-transparent",
      ].join(" ")}
    >
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6"
        aria-label="Main Navigation"
      >
        <a href="#top" className="shrink-0 transition-opacity hover:opacity-90">
          <BrandLockup />
        </a>

        <ul className="hidden items-center gap-7 lg:flex">
          {links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                className="text-sm font-medium text-[#3D5A58] transition-colors duration-150 hover:text-[#008080] cursor-pointer"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 lg:flex">
          {signedIn ? (
            <Button
              asChild
              size="sm"
              className="bg-gradient-to-r from-[#008080] to-[#0D9488] hover:from-[#006666] hover:to-[#008080] text-white font-semibold text-xs h-9 px-4 shadow-[0_2px_12px_rgba(0,128,128,0.3)] border-0"
            >
              <Link to="/dashboard">
                Go to Console <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-xs font-semibold text-[#3D5A58] hover:text-[#0F2423] hover:bg-[rgba(0,128,128,0.08)]"
              >
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-gradient-to-r from-[#008080] to-[#0D9488] hover:from-[#006666] hover:to-[#008080] text-white font-semibold text-xs h-9 px-4 shadow-[0_2px_12px_rgba(0,128,128,0.3)] border-0 transition-all duration-200"
              >
                <Link to="/auth">
                  Start Free <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </>
          )}
        </div>

        <button
          className="rounded-lg p-2 text-[#3D5A58] transition-colors hover:bg-[rgba(0,128,128,0.08)] hover:text-[#0F2423] lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-[rgba(0,128,128,0.12)] bg-white/95 backdrop-blur-xl px-4 pb-5 pt-3 shadow-xl lg:hidden">
          <ul className="grid gap-1 py-2">
            {links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-[#3D5A58] transition-colors hover:bg-[rgba(0,128,128,0.08)] hover:text-[#008080]"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-2 border-t border-[rgba(0,128,128,0.12)] pt-3">
            {signedIn ? (
              <Button
                asChild
                className="w-full bg-gradient-to-r from-[#008080] to-[#0D9488] text-white border-0"
              >
                <Link to="/dashboard">Go to Console</Link>
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-[rgba(0,128,128,0.2)] text-[#3D5A58] bg-transparent hover:bg-[rgba(0,128,128,0.08)] hover:text-[#0F2423]"
                >
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-[#008080] to-[#0D9488] text-white border-0"
                >
                  <Link to="/auth">Start Free</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
