BEGIN;
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200 AND title = btrim(title) AND title ~ '[^[:space:]]'),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 50000 AND content ~ '[^[:space:]]'),
  author text NOT NULL CHECK (char_length(author) BETWEEN 1 AND 100 AND author = btrim(author) AND author ~ '[^[:space:]]'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_created_idx ON posts (created_at DESC, id DESC);
COMMIT;
