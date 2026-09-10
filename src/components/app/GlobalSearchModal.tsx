import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  Users,
  Building2,
  Contact,
  UserCheck,
  TrendingUp,
  CheckSquare,
  Sparkles,
  Command,
  X,
  ArrowRight,
} from "lucide-react";
import { searchApi, SearchResultItem } from "@/lib/api";
import { useWorkspace } from "@/components/app/AppShell";
import { Badge } from "@/components/ui/badge";

export function GlobalSearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { current } = useWorkspace();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await searchApi.globalSearch(query, 8, current?.id);
        const items = Array.isArray(res) ? res : ((res as any)?.data || []);
        setResults(items);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, current?.id]);

  const handleSelect = (item: SearchResultItem) => {
    setIsOpen(false);
    navigate({ to: item.url });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "contact":
        return <Contact className="h-4 w-4 text-emerald-400" />;
      case "company":
        return <Building2 className="h-4 w-4 text-blue-400" />;
      case "employee":
        return <UserCheck className="h-4 w-4 text-violet-400" />;
      case "customer":
        return <Users className="h-4 w-4 text-cyan-400" />;
      case "lead":
        return <Sparkles className="h-4 w-4 text-amber-400" />;
      case "deal":
        return <TrendingUp className="h-4 w-4 text-purple-400" />;
      case "task":
        return <CheckSquare className="h-4 w-4 text-indigo-400" />;
      default:
        return <Search className="h-4 w-4 text-[#6B7280]" />;
    }
  };

  return (
    <>
      {/* Trigger Search Button in Navigation Bar */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[rgba(0,128,128,0.18)] dark:border-teal-500/25 bg-[#F8FBFA] dark:bg-[#061417] text-xs text-[#5A7573] dark:text-slate-300 hover:text-[#0F2423] dark:hover:text-white hover:bg-[rgba(0,128,128,0.06)] dark:hover:bg-teal-500/10 hover:border-[#008080]/30 transition-all cursor-pointer min-w-[200px]"
      >
        <Search className="h-3.5 w-3.5 text-[#008080] dark:text-teal-400" />
        <span className="truncate">Search records, contacts, companies...</span>
        <kbd className="ml-auto inline-flex items-center gap-0.5 rounded border border-[rgba(0,128,128,0.18)] dark:border-teal-500/30 bg-white/70 dark:bg-teal-500/15 px-1.5 text-[10px] font-mono text-[#5A7573] dark:text-teal-300">
          <Command className="h-2.5 w-2.5" /> K
        </kbd>
      </button>

      {/* Modal Backdrop & Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
          <div
            className="w-full max-w-2xl rounded-xl border border-[rgba(0,128,128,0.25)] dark:border-teal-500/35 bg-white dark:bg-[#091b1f] text-[#0F2423] dark:text-slate-100 shadow-2xl overflow-hidden backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 border-b border-[rgba(0,128,128,0.14)] dark:border-teal-500/20 px-4 py-3.5 bg-white dark:bg-[#091b1f]">
              <Search className="h-5 w-5 text-[#008080] dark:text-teal-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type to search contacts, companies, employees, deals, tasks..."
                className="flex-1 bg-transparent text-sm text-[#0F2423] dark:text-white placeholder-[#617D7B] dark:placeholder-slate-400 focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-[#617D7B] dark:text-slate-400 hover:text-[#0F2423] dark:hover:text-white p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center rounded border border-[rgba(0,128,128,0.2)] dark:border-teal-500/30 bg-[rgba(0,128,128,0.06)] dark:bg-teal-500/20 px-1.5 text-[10px] font-mono text-[#5A7573] dark:text-teal-300">
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div className="max-h-96 overflow-y-auto p-2 bg-[#FDFEFE] dark:bg-[#061417]">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-[#5A7573] dark:text-slate-400 flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#008080] dark:border-teal-400 border-t-transparent" />
                  Searching across workspace...
                </div>
              ) : query.trim() && results.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#5A7573] dark:text-slate-400">
                  No records matching <span className="text-[#0F2423] dark:text-white font-semibold">"{query}"</span>.
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-1">
                  {results.map((item, index) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                        index === selectedIndex
                          ? "bg-[rgba(0,128,128,0.12)] dark:bg-teal-500/25 text-[#0F2423] dark:text-white border border-[rgba(0,128,128,0.3)] dark:border-teal-500/40"
                          : "hover:bg-[rgba(0,128,128,0.06)] dark:hover:bg-teal-500/10 text-[#3D5A58] dark:text-slate-300 border border-transparent"
                      }`}
                    >
                      <div className="p-1.5 rounded-md bg-[#EDF4F3] dark:bg-[#0a2327]">
                        {getIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#0F2423] dark:text-white truncate">
                            {item.title}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase font-mono tracking-wider border-[rgba(0,128,128,0.2)] dark:border-teal-500/30 text-[#008080] dark:text-teal-300 px-1 py-0"
                          >
                            {item.type}
                          </Badge>
                          {item.status && (
                            <span className="text-[10px] text-[#617D7B] dark:text-slate-400 font-mono">
                              ({item.status})
                            </span>
                          )}
                        </div>
                        {item.subtitle && (
                          <p className="text-[#5A7573] dark:text-slate-400 text-[11px] truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-[#617D7B] dark:text-slate-400 opacity-60 ml-2 shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-[#617D7B] dark:text-slate-400">
                  <p className="font-semibold text-[#0F2423] dark:text-slate-200">Quick Global Search</p>
                  <p className="mt-1 text-[11px] text-[#5A7573] dark:text-slate-400">
                    Search contacts, companies, employees, customers, tasks, and deals across your organization.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-[rgba(0,128,128,0.14)] dark:border-teal-500/20 px-4 py-2.5 text-[11px] text-[#617D7B] dark:text-slate-400 bg-[#F8FBFA] dark:bg-[#091b1f]">
              <div className="flex items-center gap-3 font-mono">
                <span>↑↓ Navigate</span>
                <span>↵ Open</span>
              </div>
              <span className="text-[#008080] dark:text-teal-400 font-semibold">opteraOS Global Search</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
