CREATE TABLE polls (
  id TEXT PRIMARY KEY,
  owner_hash TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  slots TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  closes_at INTEGER NOT NULL,
  delete_at INTEGER NOT NULL
);

CREATE INDEX polls_delete_at ON polls (delete_at);

CREATE TABLE voters (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL REFERENCES polls (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX voters_poll_id ON voters (poll_id, created_at);

CREATE TABLE marks (
  voter_id TEXT NOT NULL REFERENCES voters (id) ON DELETE CASCADE,
  slot TEXT NOT NULL,
  PRIMARY KEY (voter_id, slot)
) WITHOUT ROWID;

CREATE TABLE rate_buckets (
  id TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
) WITHOUT ROWID;

CREATE INDEX rate_buckets_expires_at ON rate_buckets (expires_at);
