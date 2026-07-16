import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus, Clock3, Loader2, Check, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  addWordToReview,
  fetchCurrentArticle,
  importArticle,
  importSampleArticle,
  lookupWord,
  type Article,
  type ArticleToken,
} from "@/lib/api";

export const Route = createFileRoute("/reading")({
  head: () => ({
    meta: [
      { title: "Reading · Suomi" },
      { name: "description", content: "Easy-Finnish news with tap-to-translate lookup and a spaced-review vocabulary list." },
    ],
  }),
  component: ReadingPage,
});

function TokenWord({ w, articleTitle }: { w: ArticleToken; articleTitle: string }) {
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);

  // Missing glosses (word not in the bundled dictionary) resolve lazily via
  // the backend's dictionary→LLM fallback, cached server-side.
  const needsFetch = open && !!w.lookup && w.lookup.en == null;
  const { data: fetched, isLoading } = useQuery({
    queryKey: ["lookup", w.text],
    queryFn: () => lookupWord(w.text),
    enabled: needsFetch,
    staleTime: Infinity,
    retry: 0,
  });

  const addMutation = useMutation({
    mutationFn: () => {
      const en = w.lookup?.en ?? fetched?.en;
      if (!w.lookup || !en) throw new Error("no gloss");
      return addWordToReview(w.lookup.base, en, `From "${articleTitle}"`);
    },
    onSuccess: () => setAdded(true),
  });

  if (!w.lookup) return <>{w.text}</>;

  const en = w.lookup.en ?? fetched?.en;
  const note = w.lookup.note ?? fetched?.note;

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
        <div>
          <div className="font-display text-lg font-semibold">{w.lookup.base}</div>
          <div className="text-sm text-muted-foreground">
            {en ?? (isLoading ? "Looking up…" : "No translation found")}
          </div>
          {note && (
            <div className="mt-1 text-[11px] uppercase tracking-wide text-brand-purple">
              {note}
            </div>
          )}
        </div>
        <div className="mt-3 rounded-lg bg-muted/60 p-2 text-xs">
          <span className="text-muted-foreground">In text: </span>
          <span className="font-medium">{w.text.trim()}</span>
        </div>
        <Button
          onClick={() => addMutation.mutate()}
          disabled={!en || added || addMutation.isPending}
          className="mt-3 w-full rounded-xl bg-gradient-to-br from-brand-purple to-brand-green text-white hover:opacity-95 disabled:opacity-60"
        >
          {added ? (
            <>
              <Check className="mr-1 size-4" /> Added to review
            </>
          ) : (
            <>
              <Plus className="mr-1 size-4" /> Add to review
            </>
          )}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function ImportPanel({ onDone }: { onDone: (a: Article) => void }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");

  const sampleMutation = useMutation({ mutationFn: importSampleArticle, onSuccess: onDone });
  const importMutation = useMutation({
    mutationFn: () =>
      importArticle({ title, text, url: url || undefined, source: "Pasted text" }),
    onSuccess: onDone,
  });
  const busy = sampleMutation.isPending || importMutation.isPending;

  return (
    <div className="canvas-card mx-auto max-w-2xl p-6 md:p-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Add something to read</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Paste an easy-Finnish article (e.g. from{" "}
        <a
          href="https://yle.fi/selkouutiset"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-green hover:underline"
        >
          Yle Selkouutiset
        </a>
        ). The app looks up every word, picks key vocabulary, and writes
        comprehension questions. Only the link and the exercises are kept.
      </p>

      {busy ? (
        <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl bg-muted/40 p-8 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-brand-purple" />
          Preparing your article — looking up words and writing questions…
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title"
            />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Source link (optional)"
            />
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the article text here…"
              rows={8}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => importMutation.mutate()}
              disabled={!title.trim() || !text.trim()}
              className="rounded-xl bg-gradient-to-br from-brand-purple to-brand-green text-white hover:opacity-95"
            >
              <FileText className="mr-1.5 size-4" /> Prepare article
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => sampleMutation.mutate()}>
              Load the sample article
            </Button>
          </div>
          {(importMutation.isError || sampleMutation.isError) && (
            <p className="mt-3 text-xs text-destructive">
              Something went wrong preparing the article. Is the backend (and Ollama) running?
            </p>
          )}
        </>
      )}
    </div>
  );
}

function ReadingPage() {
  const [added, setAdded] = useState<string[]>([]);
  const [showImport, setShowImport] = useState(false);
  const queryClient = useQueryClient();

  const { data: article, isLoading } = useQuery({
    queryKey: ["article"],
    queryFn: fetchCurrentArticle,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const addVocabMutation = useMutation({
    mutationFn: ({ fi, en }: { fi: string; en: string }) =>
      addWordToReview(fi, en, article ? `From "${article.title}"` : undefined),
    onSuccess: (_res, { fi }) => {
      setAdded((a) => (a.includes(fi) ? a : [...a, fi]));
      queryClient.invalidateQueries({ queryKey: ["review-due"] });
    },
  });

  const onImported = (a: Article) => {
    queryClient.setQueryData(["article"], a);
    setShowImport(false);
    setAdded([]);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
        <div className="canvas-card p-10 text-center text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!article || showImport) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
        <ImportPanel onDone={onImported} />
        {article && (
          <p className="mt-4 text-center">
            <button
              onClick={() => setShowImport(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← Back to "{article.title}"
            </button>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <article className="canvas-card p-6 md:p-10">
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary" className="bg-brand-purple/15 text-brand-purple hover:bg-brand-purple/15">
              Easy Finnish · A2–B1
            </Badge>
            <span className="text-muted-foreground">{article.source}</span>
            <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
              <Clock3 className="size-3.5" /> {article.read_time}
            </span>
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl">
            {article.title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Tap any word for a translation. Highlighted words are key vocabulary.
          </p>
          <div className="prose mt-8 max-w-none space-y-5 text-[17px] leading-[1.8] text-canvas-foreground">
            {article.paragraphs.map((para, i) => (
              <p key={i}>
                {para.map((w, j) => (
                  <TokenWord key={j} w={w} articleTitle={article.title} />
                ))}
              </p>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-green hover:underline"
              >
                Source: {article.source} <ExternalLink className="size-3.5" />
              </a>
            )}
            <button
              onClick={() => setShowImport(true)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Read something else →
            </button>
          </div>
        </article>

        <aside className="space-y-4">
          <div className="canvas-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display font-semibold">Vocabulary</h2>
              <span className="text-xs text-muted-foreground">
                {article.vocab.length} words
              </span>
            </div>
            <ul className="space-y-2">
              {article.vocab.map((v) => {
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
                      onClick={() => addVocabMutation.mutate({ fi: v.fi, en: v.en })}
                      disabled={isAdded}
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

          {article.questions.length > 0 && (
            <div className="canvas-card p-5">
              <h2 className="mb-3 font-display font-semibold">Comprehension</h2>
              <ol className="space-y-3">
                {article.questions.map((q, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-purple to-brand-green text-xs font-semibold text-white">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{q}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Try answering out loud or in the Conversation tab.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
