import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, ArrowRight, Sun, Moon } from "lucide-react";
import { BrandLockup } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/use-theme";

const links = [
  { label: "Platform", href: "#platform" },
  { label: "AI Copilot", href: "#ai" },
  { label: "CRM & Finance", href: "#features" },
  { label: "Integrations", href: "#integrations" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

function ThemeToggle({ className }: { className?: string }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={[
        "flex items-center justify-center rounded-lg w-8 h-8 border transition-all duration-200 cursor-pointer",
        isDark
          ? "border-teal-500/40 bg-teal-900/30 text-teal-300 hover:bg-teal-800/40 hover:text-teal-200"
          : "border-[#008080]/25 bg-white/20 text-teal-100 hover:bg-white/30 hover:text-white",
        className,
      ].join(" ")}
    >
      {isDark ? (
        <Sun className="h-4 w-4 transition-transform duration-300 rotate-0 hover:rotate-12" />
      ) : (
        <Moon className="h-4 w-4 transition-transform duration-300" />
      )}
    </button>
  );
}

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
          ? "bg-[#062D2A]/95 backdrop-blur-xl border-b border-[#008080]/30 shadow-[0_4px_24px_rgba(0,32,30,0.35)]"
          : "bg-[#062D2A] border-b border-[#008080]/30 shadow-[0_2px_16px_rgba(0,32,30,0.25)]",
      ].join(" ")}
      style={{
        boxShadow: "0 1px 0 0 rgba(0, 128, 128, 0.25), 0 4px 20px 0 rgba(0, 32, 30, 0.35)",
      }}
    >
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6"
        aria-label="Main Navigation"
      >
        <a href="#top" className="shrink-0 transition-opacity hover:opacity-90">
          <BrandLockup wordmarkClassName="text-white" />
        </a>

        <ul className="hidden items-center gap-7 lg:flex">
          {links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                className="text-sm font-medium text-teal-100/80 transition-colors duration-150 hover:text-white cursor-pointer relative py-1 after:absolute after:-bottom-0.5 after:left-0 after:h-[2px] after:w-0 after:bg-[#008080] after:transition-all after:duration-200 hover:after:w-full"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 lg:flex">
          {/* Dark/Light toggle — always visible on the landing page */}
          <ThemeToggle />

          {signedIn ? (
            <Button
              asChild
              size="sm"
              className="bg-gradient-to-r from-[#008080] to-[#0D9488] hover:from-[#006666] hover:to-[#008080] text-white font-semibold text-xs h-9 px-4 shadow-[0_2px_12px_rgba(0,128,128,0.4)] border-0"
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
                className="text-xs font-semibold text-teal-100 hover:text-white hover:bg-white/10"
              >
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-gradient-to-r from-[#008080] to-[#0D9488] hover:from-[#006666] hover:to-[#008080] text-white font-semibold text-xs h-9 px-4 shadow-[0_2px_12px_rgba(0,128,128,0.4)] border-0 transition-all duration-200"
              >
                <Link to="/auth">
                  Start Free <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </>
          )}
        </div>

        <button
          className="rounded-lg p-2 text-teal-100 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-[#008080]/30 bg-[#062D2A]/98 backdrop-blur-xl px-4 pb-5 pt-3 shadow-2xl lg:hidden">
          <ul className="grid gap-1 py-2">
            {links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-teal-100 hover:bg-white/10 hover:text-white transition-colors"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-2 border-t border-[#008080]/20 pt-3">
            {/* Dark/Light toggle — mobile, always visible on landing page */}
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="text-xs font-semibold text-teal-200/70">Theme</span>
              <ThemeToggle />
            </div>

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
                  className="w-full border-[#008080]/30 text-teal-100 bg-white/5 hover:bg-white/10 hover:text-white"
                >
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-[#008080] to-[#0D9488] text-white border-0 shadow-[0_2px_12px_rgba(0,128,128,0.4)]"
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
