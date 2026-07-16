import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Mic,
  Send,
  RotateCcw,
  Sparkles,
  ChevronDown,
  BookOpen,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/conversation")({
  head: () => ({
    meta: [
      { title: "Conversation · Suomi" },
      { name: "description", content: "Chat with your Finnish tutor. Inline corrections with plain-English rule explanations." },
    ],
  }),
  component: ConversationPage,
});

type Correction = {
  original: string;
  corrected: string;
  rule: string;
  explanation: string;
};

type Message =
  | { role: "tutor"; fi: string; en: string }
  | { role: "user"; fi: string; correction?: Correction };

const topics = ["Weekend plans", "Grocery shopping", "Job interview", "Small talk", "Travel"];

const initialMessages: Message[] = [
  {
    role: "tutor",
    fi: "Hei Eli! Mitä teit viime viikonloppuna?",
    en: "Hi Eli! What did you do last weekend?",
  },
  {
    role: "user",
    fi: "Minä menin kahvila Kalliossa perjantaina.",
    correction: {
      original: "Minä menin kahvila Kalliossa perjantaina.",
      corrected: "Minä menin kahvilaan Kallioon perjantaina.",
      rule: "Illative case (-Vn / -h_n) — direction into a place",
      explanation:
        "Movement toward a place uses the illative, not the inessive. 'kahvila' → 'kahvilaan' (into the café), 'Kallio' → 'Kallioon' (to Kallio).",
    },
  },
  {
    role: "tutor",
    fi: "Ah, mukavaa! Kenen kanssa menit sinne?",
    en: "Oh, nice! Who did you go there with?",
  },
  {
    role: "user",
    fi: "Menin ystäväni kanssa. Joimme kahvia ja söi pullaa.",
    correction: {
      original: "Joimme kahvia ja söi pullaa.",
      corrected: "Joimme kahvia ja söimme pullaa.",
      rule: "Verb agreement — first person plural (me-form)",
      explanation:
        "The subject 'we' takes the -mme ending in the past tense. 'syödä' → 'söimme', matching 'joimme' earlier in the sentence.",
    },
  },
  {
    role: "tutor",
    fi: "Kuulostaa hyvältä viikonlopulta. Mitä pullaa söit — korvapuustia vai voisilmäpullaa?",
    en: "Sounds like a great weekend. What kind of bun did you have — cinnamon roll or the one with butter in the middle?",
  },
];

function CorrectionCard({ c }: { c: Correction }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-warning/25 bg-warning/5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-warning/20 text-warning">
            <Sparkles className="size-3.5" />
          </span>
          <span className="font-medium text-warning">Suggested correction</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">· {c.rule}</span>
        </div>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-warning/20 px-4 py-4 text-sm">
          <div>
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              You said
            </div>
            <p className="text-muted-foreground line-through decoration-warning/60">
              {c.original}
            </p>
          </div>
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-success">
              <Check className="size-3" /> Corrected
            </div>
            <p className="font-medium text-foreground">{c.corrected}</p>
          </div>
          <div className="rounded-xl bg-background/60 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <BookOpen className="size-3.5 text-brand-purple" /> {c.rule}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ConversationPage() {
  const [messages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [activeTopic, setActiveTopic] = useState<string>("Weekend plans");

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 md:px-8">
      {/* Shell header */}
      <div className="relative mt-6 overflow-hidden rounded-3xl border border-border/60 aurora-gradient p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/70">Live tutor</div>
            <div className="font-display text-xl font-semibold text-white">Maija · Finnish coach</div>
          </div>
          <Badge className="border-white/25 bg-white/15 text-white backdrop-blur hover:bg-white/15">
            Session 24
          </Badge>
        </div>
      </div>

      {/* Transcript (canvas) */}
      <div className="flex-1 overflow-y-auto py-6">
        <div className="space-y-6">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] space-y-2", m.role === "user" && "text-right")}>
                {m.role === "tutor" ? (
                  <div className="inline-flex flex-col items-start gap-1">
                    <div className="canvas-card px-4 py-3 text-left text-[15px] leading-relaxed">
                      {m.fi}
                    </div>
                    <div className="pl-1 text-xs text-muted-foreground">{m.en}</div>
                  </div>
                ) : (
                  <div className="inline-flex flex-col items-end gap-1">
                    <div className="rounded-2xl bg-gradient-to-br from-brand-purple to-brand-purple/80 px-4 py-3 text-left text-[15px] leading-relaxed text-white shadow-sm">
                      {m.fi}
                    </div>
                    {i === messages.length - 2 && (
                      <button className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground">
                        <RotateCcw className="size-3" /> Say it again
                      </button>
                    )}
                    {m.correction && (
                      <div className="w-full text-left">
                        <CorrectionCard c={m.correction} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 pb-6 pt-2">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Topic:</span>
          {topics.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTopic(t)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                activeTopic === t
                  ? "border-brand-purple/60 bg-brand-purple/10 text-foreground"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
          <Button variant="ghost" size="icon" aria-label="Voice input" className="rounded-xl">
            <Mic className="size-5" />
          </Button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Kirjoita suomeksi…"
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground"
          />
          <Button
            className="rounded-xl bg-gradient-to-br from-brand-purple to-brand-green text-white hover:opacity-95"
            size="icon"
            aria-label="Send"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}