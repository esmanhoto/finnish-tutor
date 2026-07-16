import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, X, ArrowRight, Sparkles, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/drills")({
  head: () => ({
    meta: [
      { title: "Drills · Suomi" },
      { name: "description", content: "Practice Finnish morphology: cases, consonant gradation, vowel harmony, verb types." },
    ],
  }),
  component: DrillsPage,
});

const categories = [
  { key: "partitive", label: "Partitive", fi: "Partitiivi", mastery: 0.7 },
  { key: "genitive", label: "Genitive", fi: "Genetiivi", mastery: 0.9 },
  { key: "inessive", label: "Inessive", fi: "Inessiivi", mastery: 0.55, active: true },
  { key: "elative", label: "Elative", fi: "Elatiivi", mastery: 0.4 },
  { key: "illative", label: "Illative", fi: "Illatiivi", mastery: 0.35 },
  { key: "adessive", label: "Adessive", fi: "Adessiivi", mastery: 0.6 },
  { key: "ablative", label: "Ablative", fi: "Ablatiivi", mastery: 0.2 },
  { key: "allative", label: "Allative", fi: "Allatiivi", mastery: 0.25 },
  { key: "gradation", label: "Consonant gradation", fi: "Astevaihtelu", mastery: 0.5 },
  { key: "harmony", label: "Vowel harmony", fi: "Vokaalisointu", mastery: 0.85 },
  { key: "verb1", label: "Verb type 1", fi: "Verbityyppi 1", mastery: 0.95 },
  { key: "verb3", label: "Verb type 3", fi: "Verbityyppi 3", mastery: 0.45 },
];

const prompt = {
  base: "kirja",
  gloss: "book",
  target: "Inessive singular",
  targetFi: "Inessiivi, yksikkö",
  hint: "'in the book' — where something is inside",
  answer: "kirjassa",
  rule: "Inessive (-ssa / -ssä): location inside. Vowel harmony picks -ssa (back vowels) or -ssä (front vowels). 'kirja' → 'kirjassa'.",
  example: "Sana on kirjassa. — The word is in the book.",
};

function Ring({ value }: { value: number }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const off = c - value * c;
  return (
    <svg width={36} height={36} viewBox="0 0 36 36">
      <circle cx="18" cy="18" r={r} className="fill-none stroke-border" strokeWidth="3" />
      <circle
        cx="18"
        cy="18"
        r={r}
        className="fill-none stroke-brand-green"
        strokeWidth="3"
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
      />
    </svg>
  );
}

function DrillsPage() {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [showHint, setShowHint] = useState(false);

  const check = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setStatus(value.trim().toLowerCase() === prompt.answer ? "correct" : "wrong");
  };
  const next = () => {
    setStatus("idle");
    setValue("");
    setShowHint(false);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
      {/* Category grid */}
      <div className="mb-8">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Drills</h1>
            <p className="text-sm text-muted-foreground">
              Pick a category. Rings show your mastery.
            </p>
          </div>
          <div className="hidden text-xs text-muted-foreground sm:block">
            Session 3 of 5 · <span className="text-foreground">Inessive</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <button
              key={c.key}
              className={cn(
                "canvas-card flex flex-col items-start gap-3 p-3 text-left transition-colors",
                c.active && "border-brand-purple/60 ring-1 ring-brand-purple/40",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <Ring value={c.mastery} />
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {Math.round(c.mastery * 100)}%
                </span>
              </div>
              <div>
                <div className="text-sm font-medium leading-tight">{c.label}</div>
                <div className="text-[11px] text-muted-foreground">{c.fi}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Player */}
      <div className="canvas-card p-6 md:p-10">
        <div className="mb-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>Prompt 4 of 12</span>
          <span>Streak 3</span>
        </div>
        <Progress value={(4 / 12) * 100} className="mb-8 h-1.5" />

        <div className="text-center">
          <div className="text-xs font-medium uppercase tracking-wider text-brand-purple">
            {prompt.target} · {prompt.targetFi}
          </div>
          <div className="mt-3 font-display text-5xl font-semibold tracking-tight md:text-6xl">
            {prompt.base}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">"{prompt.gloss}"</div>
        </div>

        <form onSubmit={check} className="mx-auto mt-10 max-w-md">
          <div
            className={cn(
              "rounded-2xl border bg-background p-1 transition-colors",
              status === "idle" && "border-border focus-within:border-brand-purple",
              status === "correct" && "border-success ring-2 ring-success/40",
              status === "wrong" && "border-destructive ring-2 ring-destructive/40",
            )}
          >
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={status !== "idle"}
              autoFocus
              placeholder="Type the inflected form…"
              className="w-full bg-transparent px-4 py-3 text-center font-display text-2xl outline-none placeholder:text-base placeholder:font-sans placeholder:text-muted-foreground"
            />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowHint((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Lightbulb className="size-3.5" />
              {showHint ? "Hide hint" : "Show hint"}
            </button>
            {status === "idle" ? (
              <Button
                type="submit"
                className="rounded-xl bg-gradient-to-br from-brand-purple to-brand-green text-white hover:opacity-95"
              >
                Check <ArrowRight className="ml-1 size-4" />
              </Button>
            ) : (
              <Button onClick={next} type="button" className="rounded-xl">
                Next <ArrowRight className="ml-1 size-4" />
              </Button>
            )}
          </div>
          {showHint && status === "idle" && (
            <div className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              {prompt.hint}
            </div>
          )}
        </form>

        {status !== "idle" && (
          <div
            className={cn(
              "mx-auto mt-8 max-w-xl overflow-hidden rounded-2xl border",
              status === "correct"
                ? "border-success/40 bg-success/10"
                : "border-destructive/40 bg-destructive/10",
            )}
          >
            <div className="flex items-center gap-2 px-4 py-3 text-sm font-semibold">
              {status === "correct" ? (
                <>
                  <span className="grid size-6 place-items-center rounded-full bg-success text-success-foreground">
                    <Check className="size-4" />
                  </span>
                  <span className="text-success">Oikein! Correct.</span>
                </>
              ) : (
                <>
                  <span className="grid size-6 place-items-center rounded-full bg-destructive text-destructive-foreground">
                    <X className="size-4" />
                  </span>
                  <span className="text-destructive">Not quite. The correct form is <span className="font-mono">{prompt.answer}</span>.</span>
                </>
              )}
            </div>
            <div className="space-y-2 border-t border-inherit/40 px-4 py-3 text-sm">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-brand-purple" />
                <p className="leading-relaxed text-foreground/90">{prompt.rule}</p>
              </div>
              <p className="rounded-lg bg-background/60 px-3 py-2 text-xs italic text-muted-foreground">
                {prompt.example}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}