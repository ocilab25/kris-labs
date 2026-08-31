import * as SQLite from "expo-sqlite";

/**
 * Single app-wide database. Opened synchronously at module load so the
 * background location task (which runs headless, outside React) can use it
 * without an async init race.
 */
export const db = SQLite.openDatabaseSync("trilha.db", { enableChangeListener: true });

db.execSync(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,
    name TEXT,
    started_at INTEGER NOT NULL,
    ended_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS outbox (
    idempotency_key TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    synced_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox (created_at) WHERE synced_at IS NULL;

  CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const ACTIVE_TRACK_KEY = "active_track_id";

/** The track currently being recorded, persisted so the headless task finds it. */
export function getActiveTrackId(): string | null {
  const row = db.getFirstSync<{ value: string }>(
    "SELECT value FROM app_state WHERE key = ?",
    ACTIVE_TRACK_KEY,
  );
  return row?.value ?? null;
}

export function setActiveTrackId(trackId: string | null): void {
  if (trackId === null) {
    db.runSync("DELETE FROM app_state WHERE key = ?", ACTIVE_TRACK_KEY);
  } else {
    db.runSync(
      "INSERT INTO app_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      ACTIVE_TRACK_KEY,
      trackId,
    );
  }
}
