import { type ReactNode, useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  MessagesSquare,
  Dumbbell,
  BookOpen,
  Layers,
  Flame,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/conversation", label: "Conversation", icon: MessagesSquare },
  { to: "/drills", label: "Drills", icon: Dumbbell },
  { to: "/reading", label: "Reading", icon: BookOpen },
  { to: "/review", label: "Review", icon: Layers },
] as const;

function useDarkMode() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { dark, toggle } = useDarkMode();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={cn(
            "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-border/60 bg-sidebar text-sidebar-foreground transition-[width] duration-300 md:flex",
            collapsed ? "w-[76px]" : "w-[240px]",
          )}
        >
          <div className="flex h-16 items-center gap-2 px-4">
            <div className="grid size-9 place-items-center rounded-xl aurora-gradient ring-glow">
              <span className="font-display text-sm font-bold text-white">S</span>
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight">
                <span className="font-display text-base font-semibold tracking-tight">Suomi</span>
                <span className="text-[11px] text-muted-foreground">Learn Finnish</span>
              </div>
            )}
          </div>
          <nav className="flex-1 space-y-1 px-3">
            {nav.map((item) => {
              const active =
                item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-lg transition-colors",
                      active
                        ? "bg-gradient-to-br from-brand-purple to-brand-green text-white"
                        : "bg-transparent",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
          <div className="p-3">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
            >
              {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl md:px-8">
            <div className="flex items-center gap-2 md:hidden">
              <div className="grid size-8 place-items-center rounded-lg aurora-gradient">
                <span className="text-xs font-bold text-white">S</span>
              </div>
              <span className="font-display font-semibold">Suomi</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-sm">
                <Flame className="size-4 text-warning" />
                <span className="font-semibold tabular-nums">12</span>
                <span className="hidden text-muted-foreground sm:inline">day streak</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Toggle theme"
                onClick={toggle}
                className="rounded-full"
              >
                {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
              <Avatar className="size-9 border border-border/60">
                <AvatarFallback className="bg-gradient-to-br from-brand-purple to-brand-green text-white text-xs font-semibold">
                  EK
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Mobile nav */}
          <nav className="flex items-center gap-1 overflow-x-auto border-b border-border/60 bg-background/70 px-3 py-2 md:hidden">
            {nav.map((item) => {
              const active =
                item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                    active
                      ? "bg-gradient-to-br from-brand-purple to-brand-green text-white"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}