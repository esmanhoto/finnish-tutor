import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, PartyPopper, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchDueCards, rateCard, type ReviewCard } from "@/lib/api";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Review · Suomi" },
      { name: "description", content: "Spaced-repetition review built from your own mistakes." },
    ],
  }),
  component: ReviewPage,
});

const RATINGS = [
  { key: "again", label: "Again", tone: "destructive" },
  { key: "hard", label: "Hard", tone: "warning" },
  { key: "good", label: "Good", tone: "brand" },
  { key: "easy", label: "Easy", tone: "success" },
] as const;

function CalmRing({ current, total }: { current: number; total: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? current / total : 0;
  const off = c - pct * c;
  return (
    <div className="relative grid size-14 place-items-center">
      <svg width={56} height={56} viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} className="fill-none stroke-border" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={r}
          className="fill-none stroke-brand-green"
          strokeWidth="4"
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
        />
      </svg>
      <span className="absolute text-xs font-semibold tabular-nums">
        {current}/{total}
      </span>
    </div>
  );
}

function ReviewPage() {
  // The session is a snapshot of the due queue at load time; rating advances
  // through it locally so "again" cards don't loop within the same sitting.
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["review-due"],
    queryFn: fetchDueCards,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const rateMutation = useMutation({
    mutationFn: ({ card, rating }: { card: ReviewCard; rating: (typeof RATINGS)[number]["key"] }) =>
      rateCard(card.id, rating),
    onSuccess: () => {
      setFlipped(false);
      setIdx((i) => i + 1);
      queryClient.invalidateQueries({ queryKey: ["review-counts"] });
    },
  });

  const deck = data?.cards ?? [];
  const done = !isLoading && (deck.length === 0 || idx >= deck.length);
  const card = deck[Math.min(idx, Math.max(deck.length - 1, 0))];

  const restart = async () => {
    setIdx(0);
    setFlipped(false);
    await refetch();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-10">
      {/* Calm header */}
      <div className="mb-8 flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Review</div>
          <div className="font-display text-xl font-semibold">Cards due today</div>
        </div>
        <CalmRing current={Math.min(idx, deck.length)} total={deck.length} />
      </div>

      {isLoading ? (
        <div className="canvas-card p-10 text-center text-sm text-muted-foreground">
          Loading your deck…
        </div>
      ) : done ? (
        /* Celebration — expressive shell surface */
        <div className="relative overflow-hidden rounded-3xl border border-border/60 aurora-gradient p-10 text-center text-white">
          <div className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay [background:radial-gradient(600px_200px_at_50%_0%,white,transparent)]" />
          <div className="relative">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/20 backdrop-blur">
              <PartyPopper className="size-7" />
            </div>
            <h2 className="mt-5 font-display text-3xl font-bold tracking-tight">
              {deck.length > 0 ? "Hienoa työtä!" : "Kaikki kunnossa!"}
            </h2>
            <p className="mt-2 text-white/85">
              {deck.length > 0
                ? `You cleared all ${deck.length} cards. Your memory just got a little stronger.`
                : "Nothing is due right now. Mistakes from drills, conversation, and reading will appear here."}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button
                onClick={restart}
                className="rounded-xl bg-white text-foreground hover:bg-white/90"
              >
                <RotateCcw className="mr-1.5 size-4" /> Check again
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-xl border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Link to="/">
                  Back to home <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={() => setFlipped((f) => !f)}
            className="canvas-card group relative block w-full overflow-hidden p-10 text-left transition-all hover:border-brand-purple/40"
          >
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {flipped ? "Answer" : "Front"} · card {idx + 1} of {deck.length} · from{" "}
              {card.source}
            </div>
            <div className="mt-6 min-h-40">
              {!flipped ? (
                <div className="font-display text-5xl font-semibold tracking-tight md:text-6xl">
                  {card.front}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
                    {card.back}
                  </div>
                  {(card.rule || card.example) && (
                    <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3">
                      <Sparkles className="mt-0.5 size-4 shrink-0 text-brand-purple" />
                      <div className="text-sm leading-relaxed">
                        {card.rule && <div>{card.rule}</div>}
                        {card.example && (
                          <div className="mt-1 text-xs italic text-muted-foreground">
                            {card.example}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-6 text-xs text-muted-foreground">
              {flipped ? "Tap card to hide" : "Tap card to reveal"}
            </div>
          </button>

          <div className="mt-6 grid grid-cols-4 gap-2">
            {RATINGS.map((r) => (
              <button
                key={r.key}
                onClick={() => rateMutation.mutate({ card, rating: r.key })}
                disabled={!flipped || rateMutation.isPending}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-2xl border py-3 text-sm font-medium transition-all disabled:opacity-40",
                  r.tone === "destructive" &&
                    "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15",
                  r.tone === "warning" &&
                    "border-warning/40 bg-warning/10 text-warning hover:bg-warning/15",
                  r.tone === "brand" &&
                    "border-brand-purple/40 bg-brand-purple/10 text-foreground hover:bg-brand-purple/20",
                  r.tone === "success" &&
                    "border-success/40 bg-success/10 text-success hover:bg-success/15",
                )}
              >
                <span>{r.label}</span>
                <span className="text-[10px] font-normal opacity-70">
                  {card.intervals[r.key]}
                </span>
              </button>
            ))}
          </div>
          {!flipped && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Reveal the answer to rate.
            </p>
          )}
        </>
      )}
    </div>
  );
}
