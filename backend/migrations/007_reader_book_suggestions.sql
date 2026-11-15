CREATE TABLE IF NOT EXISTS ixs_reader_book_suggestions (
  id VARCHAR(80) PRIMARY KEY,
  reader_id VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(500) NOT NULL,
  publisher VARCHAR(255),
  publication_year INT,
  requested_quantity INT,
  edition VARCHAR(100),
  isbn VARCHAR(32),
  reason TEXT,
  cover_url TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'CHO DUYET',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ixs_reader_book_suggestions_reader_idx
  ON ixs_reader_book_suggestions (reader_id, submitted_at DESC);