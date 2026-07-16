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
