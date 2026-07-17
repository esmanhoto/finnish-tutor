export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      /* keep statusText */
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

// ---- Drills

export type DrillCategory = {
  key: string;
  label: string;
  fi: string;
  mastery: number;
  items: number;
};

export type DrillItem = {
  id: number;
  category: string;
  base: string;
  gloss: string;
  target: string;
  target_fi: string;
  hint: string | null;
};

export type DrillCheckResult = {
  correct: boolean;
  answer: string;
  rule: string;
  example: string;
  card_created: boolean;
};

export const fetchDrillCategories = () => api<DrillCategory[]>("/drills/categories");

export const fetchDrillSession = (category: string) =>
  api<{ category: string; items: DrillItem[] }>(
    `/drills/session?category=${encodeURIComponent(category)}`,
  );

export const checkDrillAnswer = (item_id: number, answer: string) =>
  api<DrillCheckResult>("/drills/check", {
    method: "POST",
    body: JSON.stringify({ item_id, answer }),
  });

// ---- Review (SRS)

export type ReviewCard = {
  id: number;
  front: string;
  back: string;
  rule: string | null;
  example: string | null;
  source: "drill" | "conversation" | "reading";
  intervals: { again: string; hard: string; good: string; easy: string };
};

export type ReviewCounts = {
  due: number;
  learning: number;
  mastered: number;
  total: number;
};

export const fetchDueCards = () =>
  api<{ cards: ReviewCard[]; counts: ReviewCounts }>("/review/due");

export const rateCard = (card_id: number, rating: "again" | "hard" | "good" | "easy") =>
  api<{ card_id: number; due: string; remaining: number }>("/review/rate", {
    method: "POST",
    body: JSON.stringify({ card_id, rating }),
  });

// ---- Conversation

export type Correction = {
  original: string;
  corrected: string;
  rule: string;
  explanation: string;
};

export type ChatMessage = {
  id: number;
  role: "tutor" | "user";
  fi: string;
  en: string | null;
  correction: Correction | null;
};

export type Conversation = {
  id: number;
  topic: string;
  messages: ChatMessage[];
};

export const fetchCurrentConversation = () => api<Conversation | null>("/conversation/current");

export const startConversation = (topic: string) =>
  api<Conversation>("/conversation", {
    method: "POST",
    body: JSON.stringify({ topic }),
  });

export const sendChatMessage = (conversation_id: number, fi: string) =>
  api<Conversation>("/conversation/message", {
    method: "POST",
    body: JSON.stringify({ conversation_id, fi }),
  });

// ---- Reading

export type ArticleToken = {
  text: string;
  lookup?: { base: string; en: string | null; note: string | null };
  unknown?: boolean;
};

export type Article = {
  id: number;
  title: string;
  source: string;
  url: string | null;
  published: string | null;
  paragraphs: ArticleToken[][];
  vocab: { fi: string; en: string }[];
  questions: string[];
  read_time: string;
  word_count: number;
};

export type WordLookup = {
  base: string;
  en: string;
  note: string | null;
  llm: boolean;
};

export const fetchCurrentArticle = () => api<Article | null>("/reading/current");

export const importArticle = (payload: {
  title: string;
  text: string;
  url?: string;
  source?: string;
}) =>
  api<Article>("/reading/import", { method: "POST", body: JSON.stringify(payload) });

export const importSampleArticle = () =>
  api<Article>("/reading/sample", { method: "POST" });

export type YleHeadline = { page: number; title: string };

export const fetchYleHeadlines = () =>
  api<{ headlines: YleHeadline[] }>("/reading/yle/headlines");

export const importYleArticle = (page: number) =>
  api<Article>(`/reading/yle/${page}`, { method: "POST" });

export const lookupWord = (word: string) =>
  api<WordLookup>(`/reading/lookup?word=${encodeURIComponent(word)}`);

export const addWordToReview = (fi: string, en: string, context?: string) =>
  api<{ created: boolean }>("/reading/add-to-review", {
    method: "POST",
    body: JSON.stringify({ fi, en, context }),
  });

// ---- Dashboard

export type StatTile = { value: number; week: number; spark: number[]; total?: number };

export type Dashboard = {
  name: string;
  level: string;
  streak: number;
  today_minutes: number;
  goal_minutes: number;
  stats: {
    words_learned: StatTile;
    cases_mastered: StatTile;
    minutes_practiced: StatTile;
  };
  review: { due: number; learning: number; mastered: number; total: number };
  resume: {
    conversation: string | null;
    drill: string | null;
    article: string | null;
  };
  word_of_day: { fi: string; en: string; example: string | null };
};

export const fetchDashboard = () => api<Dashboard>("/stats/dashboard");
