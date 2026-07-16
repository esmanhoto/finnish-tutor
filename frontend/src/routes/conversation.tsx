import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Mic,
  Send,
  RotateCcw,
  Sparkles,
  ChevronDown,
  BookOpen,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  fetchCurrentConversation,
  sendChatMessage,
  startConversation,
  type Conversation,
  type Correction,
} from "@/lib/api";

export const Route = createFileRoute("/conversation")({
  head: () => ({
    meta: [
      { title: "Conversation · Suomi" },
      { name: "description", content: "Chat with your Finnish tutor. Inline corrections with plain-English rule explanations." },
    ],
  }),
  component: ConversationPage,
});

const topics = ["Weekend plans", "Grocery shopping", "Job interview", "Small talk", "Travel"];

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
  const [draft, setDraft] = useState("");
  const [pendingUserFi, setPendingUserFi] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversation, isLoading } = useQuery({
    queryKey: ["conversation"],
    queryFn: fetchCurrentConversation,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const startMutation = useMutation({
    mutationFn: startConversation,
    onSuccess: (conv) => queryClient.setQueryData(["conversation"], conv),
  });

  const sendMutation = useMutation({
    mutationFn: ({ id, fi }: { id: number; fi: string }) => sendChatMessage(id, fi),
    onMutate: ({ fi }) => setPendingUserFi(fi),
    onSuccess: (conv: Conversation) => {
      queryClient.setQueryData(["conversation"], conv);
      queryClient.invalidateQueries({ queryKey: ["review-due"] });
    },
    onSettled: () => setPendingUserFi(null),
  });

  const messages = conversation?.messages ?? [];
  const busy = startMutation.isPending || sendMutation.isPending;
  const lastUserIdx = messages.reduce(
    (acc, m, i) => (m.role === "user" ? i : acc),
    -1,
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, pendingUserFi]);

  const send = () => {
    const fi = draft.trim();
    if (!fi || busy || !conversation) return;
    setDraft("");
    sendMutation.mutate({ id: conversation.id, fi });
  };

  const sayItAgain = () => {
    const last = messages[lastUserIdx];
    if (!last) return;
    setDraft(last.fi);
    textareaRef.current?.focus();
  };

  const pickTopic = (topic: string) => {
    if (busy) return;
    // A new topic starts a fresh conversation with a fresh opener.
    if (!conversation || conversation.topic !== topic) {
      startMutation.mutate(topic);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 md:px-8">
      {/* Shell header */}
      <div className="relative mt-6 overflow-hidden rounded-3xl border border-border/60 aurora-gradient p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/70">Live tutor</div>
            <div className="font-display text-xl font-semibold text-white">Maija · Finnish coach</div>
          </div>
          {conversation && (
            <Badge className="border-white/25 bg-white/15 text-white backdrop-blur hover:bg-white/15">
              {conversation.topic}
            </Badge>
          )}
        </div>
      </div>

      {/* Transcript (canvas) */}
      <div className="flex-1 overflow-y-auto py-6">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : !conversation && !startMutation.isPending ? (
          <div className="canvas-card mx-auto max-w-md p-8 text-center">
            <div className="font-display text-lg font-semibold">Aloitetaan!</div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Pick a topic below to start chatting with Maija. She replies in
              Finnish and corrects your grammar as you go.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((m, i) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] space-y-2", m.role === "user" && "text-right")}>
                  {m.role === "tutor" ? (
                    <div className="inline-flex flex-col items-start gap-1">
                      <div className="canvas-card px-4 py-3 text-left text-[15px] leading-relaxed">
                        {m.fi}
                      </div>
                      {m.en && <div className="pl-1 text-xs text-muted-foreground">{m.en}</div>}
                    </div>
                  ) : (
                    <div className="inline-flex flex-col items-end gap-1">
                      <div className="rounded-2xl bg-gradient-to-br from-brand-purple to-brand-purple/80 px-4 py-3 text-left text-[15px] leading-relaxed text-white shadow-sm">
                        {m.fi}
                      </div>
                      {i === lastUserIdx && !busy && (
                        <button
                          onClick={sayItAgain}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                        >
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
            {pendingUserFi && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl bg-gradient-to-br from-brand-purple to-brand-purple/80 px-4 py-3 text-left text-[15px] leading-relaxed text-white opacity-70 shadow-sm">
                  {pendingUserFi}
                </div>
              </div>
            )}
            {busy && (
              <div className="flex justify-start">
                <div className="canvas-card inline-flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Maija miettii…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 pb-6 pt-2">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Topic:</span>
          {topics.map((t) => (
            <button
              key={t}
              onClick={() => pickTopic(t)}
              disabled={busy}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50",
                conversation?.topic === t
                  ? "border-brand-purple/60 bg-brand-purple/10 text-foreground"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
          <Button variant="ghost" size="icon" aria-label="Voice input" className="rounded-xl" disabled>
            <Mic className="size-5" />
          </Button>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={conversation ? "Kirjoita suomeksi…" : "Pick a topic to start…"}
            rows={1}
            disabled={!conversation || busy}
            className="flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />
          <Button
            className="rounded-xl bg-gradient-to-br from-brand-purple to-brand-green text-white hover:opacity-95"
            size="icon"
            aria-label="Send"
            onClick={send}
            disabled={!conversation || busy || !draft.trim()}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
