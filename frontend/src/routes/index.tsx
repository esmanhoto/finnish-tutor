import { createFileRoute, Link } from "@tanstack/react-router";
import {
  MessagesSquare,
  Dumbbell,
  BookOpen,
  Layers,
  ArrowRight,
  Sparkle,
  TrendingUp,
  Clock3,
  Type,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home · Suomi" },
      { name: "description", content: "Your daily Finnish practice — conversation, drills, reading, and review." },
    ],
  }),
  component: Home,
});

const today = [
  {
    to: "/conversation",
    icon: MessagesSquare,
    title: "Talk",
    fi: "Puhu",
    description: "Continue your chat about your weekend at Kallio",
    cta: "Resume conversation",
    minutes: "8 min",
  },
  {
    to: "/drills",
    icon: Dumbbell,
    title: "Drill cases",
    fi: "Sijamuodot",
    description: "Partitive singular — 4 of 12 mastered",
    cta: "Continue drill",
    minutes: "5 min",
  },
  {
    to: "/reading",
    icon: BookOpen,
    title: "Read",
    fi: "Lue",
    description: "Selkouutiset: Sähkön hinta laskee ensi viikolla",
    cta: "Open article",
    minutes: "6 min",
  },
  {
    to: "/review",
    icon: Layers,
    title: "Review",
    fi: "Kertaa",
    description: "18 cards are due today from your mistakes",
    cta: "Start review",
    minutes: "10 min",
  },
] as const;

const stats = [
  { label: "Words learned", value: "312", delta: "+24 this week", spark: [4, 6, 5, 8, 7, 12, 10] },
  { label: "Cases mastered", value: "9 / 15", delta: "+1 this week", spark: [1, 2, 3, 4, 5, 6, 7] },
  { label: "Minutes practiced", value: "184", delta: "+42 this week", spark: [12, 18, 14, 22, 30, 28, 38] },
];

function Spark({ points }: { points: number[] }) {
  const w = 90;
  const h = 28;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="text-brand-green">
      <defs>
        <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill="url(#sparkFill)" />
      <path d={d} stroke="currentColor" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
      {/* Hero (shell surface) */}
      <section className="relative overflow-hidden rounded-3xl border border-border/60 aurora-gradient p-6 md:p-10">
        <div className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay [background:radial-gradient(600px_200px_at_80%_0%,white,transparent)]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <Badge className="mb-4 bg-white/15 text-white border-white/25 backdrop-blur hover:bg-white/15">
              <Sparkle className="mr-1.5 size-3" />
              Intermediate · B1
            </Badge>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-5xl">
              Hyvää huomenta, Eli.
            </h1>
            <p className="mt-3 text-base text-white/85 md:text-lg">
              You're on a <span className="font-semibold text-white">12-day streak</span>. A short
              conversation and a case drill would keep it going.
            </p>
          </div>
          <div className="glass-shell flex items-center gap-4 rounded-2xl p-4 text-white">
            <div className="grid size-12 place-items-center rounded-xl bg-white/15">
              <Clock3 className="size-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-white/70">Today's goal</div>
              <div className="font-semibold">12 / 20 min</div>
              <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-white/15">
                <div className="h-full w-[60%] rounded-full bg-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Today cards (working surface — solid) */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight">Today</h2>
          <span className="text-sm text-muted-foreground">Pick where to start</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {today.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="group canvas-card flex flex-col justify-between p-5 transition-all hover:-translate-y-0.5 hover:border-brand-purple/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-brand-purple/20 to-brand-green/20 text-foreground">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {item.minutes}
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="font-display text-lg font-semibold">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.fi}</div>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between text-sm font-medium text-brand-green">
                  {item.cta}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Weekly + curve */}
      <section className="mt-10 grid gap-4 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="canvas-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <TrendingUp className="size-4 text-brand-green" />
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <div className="font-display text-3xl font-bold tabular-nums">{s.value}</div>
                <div className="text-xs text-success">{s.delta}</div>
              </div>
              <Spark points={s.spark} />
            </div>
          </div>
        ))}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 canvas-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Forgetting-curve health</div>
              <div className="mt-1 font-display text-2xl font-semibold">
                <span className="tabular-nums">18</span>{" "}
                <span className="text-base font-medium text-muted-foreground">cards due today</span>
              </div>
            </div>
            <Link
              to="/review"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-purple to-brand-green px-4 py-2 text-sm font-medium text-white hover:opacity-95"
            >
              Start review <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Due today", value: 18, tone: "text-warning" },
              { label: "Learning", value: 42, tone: "text-brand-purple" },
              { label: "Mastered", value: 190, tone: "text-brand-green" },
            ].map((r) => (
              <div key={r.label}>
                <div className={`font-display text-2xl font-semibold tabular-nums ${r.tone}`}>
                  {r.value}
                </div>
                <div className="text-xs text-muted-foreground">{r.label}</div>
                <Progress value={(r.value / 250) * 100} className="mt-2 h-1.5" />
              </div>
            ))}
          </div>
        </div>

        <div className="canvas-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Type className="size-4" /> Word of the day
          </div>
          <div className="mt-3 font-display text-3xl font-semibold tracking-tight">sattumalta</div>
          <div className="mt-1 text-sm text-muted-foreground">by chance, coincidentally</div>
          <p className="mt-4 rounded-xl bg-muted/60 p-3 text-sm leading-relaxed">
            <span className="text-foreground">Tapasin hänet kahvilassa aivan </span>
            <span className="font-semibold text-brand-green">sattumalta</span>
            <span className="text-foreground">.</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              I met her at the café completely by chance.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}