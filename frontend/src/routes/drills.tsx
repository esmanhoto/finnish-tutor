import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, ArrowRight, Sparkles, Lightbulb, RotateCcw, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  checkDrillAnswer,
  fetchDrillCategories,
  fetchDrillSession,
  type DrillCheckResult,
} from "@/lib/api";

// A short reminder of each category's ending(s), shown beside the name so you
// don't have to remember which case is which.
const CATEGORY_ENDINGS: Record<string, string> = {
  partitive: "-a/-ä · -ta/-tä",
  genitive: "-n",
  inessive: "-ssa/-ssä",
  elative: "-sta/-stä",
  illative: "-Vn · -seen",
  adessive: "-lla/-llä",
  ablative: "-lta/-ltä",
  allative: "-lle",
  gradation: "weak grade",
  harmony: "front ↔ back",
  verb1: "type 1 verb",
  verb3: "type 3 verb",
};

export const Route = createFileRoute("/drills")({
  head: () => ({
    meta: [
      { title: "Drills · Suomi" },
      { name: "description", content: "Practice Finnish morphology: cases, consonant gradation, vowel harmony, verb types." },
    ],
  }),
  component: DrillsPage,
});

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
  const [category, setCategory] = useState("partitive");
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<DrillCheckResult | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [streak, setStreak] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ["drill-categories"],
    queryFn: fetchDrillCategories,
  });

  const { data: session, refetch: newSession } = useQuery({
    queryKey: ["drill-session", category],
    queryFn: () => fetchDrillSession(category),
    staleTime: Infinity,
  });

  const checkMutation = useMutation({
    mutationFn: ({ itemId, answer }: { itemId: number; answer: string }) =>
      checkDrillAnswer(itemId, answer),
    onSuccess: (res) => {
      setResult(res);
      setStreak((s) => (res.correct ? s + 1 : 0));
      queryClient.invalidateQueries({ queryKey: ["drill-categories"] });
    },
  });

  const items = session?.items ?? [];
  const item = items[idx];
  const done = items.length > 0 && idx >= items.length;
  const status = result === null ? "idle" : result.correct ? "correct" : "wrong";

  // Reset the player whenever the category (and thus the session) changes.
  useEffect(() => {
    setIdx(0);
    setValue("");
    setResult(null);
    setShowHint(false);
    setStreak(0);
  }, [category, session]);

  const check = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || !item || checkMutation.isPending) return;
    checkMutation.mutate({ itemId: item.id, answer: value });
  };

  const next = () => {
    setResult(null);
    setValue("");
    setShowHint(false);
    setIdx((i) => i + 1);
  };

  // Keep focus in the input on every fresh prompt so the whole drill is
  // keyboard-only — advancing with Enter would otherwise leave focus behind.
  useEffect(() => {
    if (status === "idle") inputRef.current?.focus();
  }, [idx, status]);

  // Once a result is showing, Enter advances to the next prompt (the input is
  // disabled, so the form's own submit no longer fires).
  useEffect(() => {
    if (status === "idle") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status]);

  const restart = () => {
    void newSession();
  };

  const activeMeta = categories?.find((c) => c.key === category);

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
            Practising <span className="text-foreground">{activeMeta?.label ?? category}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(categories ?? []).map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={cn(
                "canvas-card flex flex-col items-start gap-3 p-3 text-left transition-colors",
                c.key === category && "border-brand-purple/60 ring-1 ring-brand-purple/40",
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
                {CATEGORY_ENDINGS[c.key] && (
                  <div className="mt-0.5 font-mono text-[11px] text-brand-purple/80">
                    {CATEGORY_ENDINGS[c.key]}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Player */}
      <div className="canvas-card p-6 md:p-10">
        {done ? (
          <div className="py-10 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-purple/20 to-brand-green/20">
              <Check className="size-6 text-brand-green" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-semibold">Session complete</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length} prompts done. Mistakes were added to your review deck.
            </p>
            <Button
              onClick={restart}
              className="mt-6 rounded-xl bg-gradient-to-br from-brand-purple to-brand-green text-white hover:opacity-95"
            >
              <RotateCcw className="mr-1.5 size-4" /> New session
            </Button>
          </div>
        ) : !item ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Loading session…
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Prompt {idx + 1} of {items.length}
              </span>
              <span>Streak {streak}</span>
            </div>
            <Progress value={(idx / items.length) * 100} className="mb-8 h-1.5" />

            <div className="text-center">
              <div className="text-xs font-medium uppercase tracking-wider text-brand-purple">
                {item.target} · {item.target_fi}
                {CATEGORY_ENDINGS[category] && (
                  <span className="ml-2 font-mono normal-case text-brand-purple/80">
                    ({CATEGORY_ENDINGS[category]})
                  </span>
                )}
              </div>
              <div className="mt-3 font-display text-5xl font-semibold tracking-tight md:text-6xl">
                {item.base}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">"{item.gloss}"</div>
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
                  ref={inputRef}
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
                    disabled={checkMutation.isPending}
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
              {showHint && status === "idle" && item.hint && (
                <div className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  {item.hint}
                </div>
              )}
            </form>

            {result && (
              <div
                className={cn(
                  "mx-auto mt-8 max-w-xl overflow-hidden rounded-2xl border",
                  result.correct
                    ? "border-success/40 bg-success/10"
                    : "border-destructive/40 bg-destructive/10",
                )}
              >
                <div className="flex items-center gap-2 px-4 py-3 text-sm font-semibold">
                  {result.correct ? (
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
                      <span className="text-destructive">
                        Not quite. The correct form is{" "}
                        <span className="font-mono">{result.answer}</span>.
                      </span>
                    </>
                  )}
                </div>
                <div className="space-y-2 border-t border-inherit/40 px-4 py-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-brand-purple" />
                    <p className="leading-relaxed text-foreground/90">{result.rule}</p>
                  </div>
                  <p className="rounded-lg bg-background/60 px-3 py-2 text-xs italic text-muted-foreground">
                    {result.example}
                  </p>
                  {result.card_created && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Layers className="size-3.5" /> Added to your review deck.
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
