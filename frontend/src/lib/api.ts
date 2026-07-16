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
