import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink, Plus, Volume2, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reading")({
  head: () => ({
    meta: [
      { title: "Reading · Suomi" },
      { name: "description", content: "Easy-Finnish news with tap-to-translate lookup and a spaced-review vocabulary list." },
    ],
  }),
  component: ReadingPage,
});

type Word = { text: string; lookup?: { base: string; en: string; note?: string }; unknown?: boolean };

const article: { title: string; source: string; date: string; readTime: string; paragraphs: Word[][] } = {
  title: "Sähkön hinta laskee ensi viikolla",
  source: "Yle Selkouutiset",
  date: "Maaliskuu 14",
  readTime: "4 min",
  paragraphs: [
    [
      { text: "Sähkön", lookup: { base: "sähkö", en: "electricity" }, unknown: true },
      { text: " " },
      { text: "hinta", lookup: { base: "hinta", en: "price" } },
      { text: " " },
      { text: "laskee", lookup: { base: "laskea", en: "to fall, drop", note: "verb type 3" }, unknown: true },
      { text: " ensi viikolla Suomessa. " },
      { text: "Syynä", lookup: { base: "syy", en: "reason, cause" }, unknown: true },
      { text: " on lämmin sää ja tuulinen viikko." },
    ],
    [
      { text: "Asiantuntijat", lookup: { base: "asiantuntija", en: "expert, specialist" }, unknown: true },
      { text: " sanovat, että hinta voi olla jopa 20 prosenttia halvempi kuin nyt. " },
      { text: "Ihmiset", lookup: { base: "ihminen", en: "person, human" } },
      { text: " voivat säästää rahaa, kun he käyttävät sähköä yöllä." },
    ],
    [
      { text: "Ensi viikolla tuulee paljon rannikolla, ja " },
      { text: "tuulivoimalat", lookup: { base: "tuulivoimala", en: "wind turbine" }, unknown: true },
      { text: " tuottavat runsaasti sähköä. Lämpötila nousee noin viiteen asteeseen." },
    ],
  ],
};

const vocab = [
  { fi: "sähkö", en: "electricity" },
  { fi: "laskea", en: "to fall, drop" },
  { fi: "syy", en: "reason, cause" },
  { fi: "asiantuntija", en: "expert" },
  { fi: "tuulivoimala", en: "wind turbine" },
];

const questions = [
  "Miksi sähkön hinta laskee ensi viikolla?",
  "Kuinka paljon halvempi hinta voi olla?",
  "Milloin ihmiset voivat säästää rahaa?",
];

function TokenWord({ w }: { w: Word }) {
  if (!w.lookup) return <>{w.text}</>;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "rounded-sm px-0.5 transition-colors hover:bg-brand-purple/15 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            w.unknown && "bg-brand-purple/10 underline decoration-brand-purple/40 decoration-2 underline-offset-4",
          )}
        >
          {w.text}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-display text-lg font-semibold">{w.lookup.base}</div>
            <div className="text-sm text-muted-foreground">{w.lookup.en}</div>
            {w.lookup.note && (
              <div className="mt-1 text-[11px] uppercase tracking-wide text-brand-purple">
                {w.lookup.note}
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" aria-label="Play audio" className="rounded-full">
            <Volume2 className="size-4" />
          </Button>
        </div>
        <div className="mt-3 rounded-lg bg-muted/60 p-2 text-xs">
          <span className="text-muted-foreground">In text: </span>
          <span className="font-medium">{w.text.trim()}</span>
        </div>
        <Button className="mt-3 w-full rounded-xl bg-gradient-to-br from-brand-purple to-brand-green text-white hover:opacity-95">
          <Plus className="mr-1 size-4" /> Add to review
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function ReadingPage() {
  const [added, setAdded] = useState<string[]>([]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <article className="canvas-card p-6 md:p-10">
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary" className="bg-brand-purple/15 text-brand-purple hover:bg-brand-purple/15">
              Easy Finnish · A2–B1
            </Badge>
            <span className="text-muted-foreground">{article.source}</span>
            <span className="text-muted-foreground">· {article.date}</span>
            <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
              <Clock3 className="size-3.5" /> {article.readTime}
            </span>
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl">
            {article.title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Tap any word for a translation. Highlighted words are new to you.
          </p>
          <div className="prose mt-8 max-w-none space-y-5 text-[17px] leading-[1.8] text-canvas-foreground">
            {article.paragraphs.map((para, i) => (
              <p key={i}>
                {para.map((w, j) => (
                  <TokenWord key={j} w={w} />
                ))}
              </p>
            ))}
          </div>
          <a
            href="https://yle.fi/selkouutiset"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 inline-flex items-center gap-1.5 text-sm font-medium text-brand-green hover:underline"
          >
            Source: Yle Selkouutiset <ExternalLink className="size-3.5" />
          </a>
        </article>

        <aside className="space-y-4">
          <div className="canvas-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display font-semibold">Vocabulary</h2>
              <span className="text-xs text-muted-foreground">{vocab.length} words</span>
            </div>
            <ul className="space-y-2">
              {vocab.map((v) => {
                const isAdded = added.includes(v.fi);
                return (
                  <li
                    key={v.fi}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm"
                  >
                    <div>
                      <div className="font-medium">{v.fi}</div>
                      <div className="text-xs text-muted-foreground">{v.en}</div>
                    </div>
                    <button
                      onClick={() =>
                        setAdded((a) => (a.includes(v.fi) ? a : [...a, v.fi]))
                      }
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        isAdded
                          ? "border-success/40 bg-success/15 text-success"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {isAdded ? "Added" : "+ Review"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="canvas-card p-5">
            <h2 className="mb-3 font-display font-semibold">Comprehension</h2>
            <ol className="space-y-3">
              {questions.map((q, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-purple to-brand-green text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{q}</span>
                </li>
              ))}
            </ol>
            <Button variant="outline" className="mt-4 w-full rounded-xl">
              Answer questions
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}