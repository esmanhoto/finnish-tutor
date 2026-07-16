-- Finnish Tutor — local single-user database. All timestamps are UTC ISO-8601.

CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    rule TEXT,
    example TEXT,
    source TEXT NOT NULL CHECK (source IN ('drill', 'conversation', 'reading')),
    fsrs_json TEXT NOT NULL,          -- serialized py-fsrs Card state
    due TEXT NOT NULL,                -- denormalized from fsrs_json for querying
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (front, back)
);
CREATE INDEX IF NOT EXISTS idx_cards_due ON cards (due);

CREATE TABLE IF NOT EXISTS review_log (
    id INTEGER PRIMARY KEY,
    card_id INTEGER NOT NULL REFERENCES cards (id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,          -- 1 Again, 2 Hard, 3 Good, 4 Easy
    reviewed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS drill_items (
    id INTEGER PRIMARY KEY,
    category TEXT NOT NULL,           -- e.g. 'inessive', 'gradation', 'verb1'
    base TEXT NOT NULL,               -- dictionary form shown to the user
    gloss TEXT NOT NULL,              -- English meaning of the base word
    target TEXT NOT NULL,             -- e.g. 'Inessive singular'
    target_fi TEXT NOT NULL,          -- e.g. 'Inessiivi, yksikkö'
    answer TEXT NOT NULL,             -- Voikko-verified inflected form
    hint TEXT,
    rule TEXT NOT NULL,
    example TEXT NOT NULL,
    features TEXT NOT NULL,           -- JSON of expected Voikko analysis features
    UNIQUE (category, base, target)
);

CREATE TABLE IF NOT EXISTS drill_attempts (
    id INTEGER PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES drill_items (id) ON DELETE CASCADE,
    given TEXT NOT NULL,
    correct INTEGER NOT NULL,
    attempted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_attempts_item ON drill_attempts (item_id);

CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY,
    topic TEXT NOT NULL,
    started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('tutor', 'user')),
    fi TEXT NOT NULL,
    en TEXT,                          -- tutor messages only
    correction TEXT,                  -- JSON, user messages only
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages (conversation_id);

-- Article text lives only in this local, gitignored database (never in the repo).
CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY,
    url TEXT,
    source TEXT NOT NULL,             -- e.g. 'Yle Selkouutiset', 'Pasted text'
    title TEXT NOT NULL,
    published TEXT,
    derived TEXT NOT NULL,            -- JSON: tokenized paragraphs, vocab, questions
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- LLM-supplied glosses for words missing from the bundled dictionary.
CREATE TABLE IF NOT EXISTS dict_overrides (
    lemma TEXT PRIMARY KEY,
    gloss TEXT NOT NULL,
    pos TEXT
);

CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('drill', 'conversation', 'review', 'reading')),
    seconds INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
