import type { OutboxEntry, TrackPoint } from "@kris-labs/schemas";
import { outboxEntrySchema, trackPointSchema } from "@kris-labs/schemas";
import type { OutboxStore } from "@kris-labs/sync";
import { db } from "./db";

interface OutboxRow {
  idempotency_key: string;
  kind: string;
  payload: string;
  created_at: number;
  synced_at: number | null;
}

function rowToEntry(row: OutboxRow): OutboxEntry {
  return outboxEntrySchema.parse({
    idempotencyKey: row.idempotency_key,
    kind: row.kind,
    payload: JSON.parse(row.payload),
    createdAt: row.created_at,
    syncedAt: row.synced_at,
  });
}

/** SQLite adapter for the generic outbox engine in @kris-labs/sync. */
export const sqliteOutboxStore: OutboxStore = {
  async insert(entry) {
    db.runSync(
      "INSERT OR IGNORE INTO outbox (idempotency_key, kind, payload, created_at, synced_at) VALUES (?, ?, ?, ?, ?)",
      entry.idempotencyKey,
      entry.kind,
      JSON.stringify(entry.payload),
      entry.createdAt,
      entry.syncedAt,
    );
  },
  async listPending(limit) {
    const rows = db.getAllSync<OutboxRow>(
      "SELECT * FROM outbox WHERE synced_at IS NULL ORDER BY created_at ASC LIMIT ?",
      limit,
    );
    return rows.map(rowToEntry);
  },
  async markSynced(idempotencyKeys, syncedAt) {
    const placeholders = idempotencyKeys.map(() => "?").join(",");
    db.runSync(
      `UPDATE outbox SET synced_at = ? WHERE idempotency_key IN (${placeholders})`,
      syncedAt,
      ...idempotencyKeys,
    );
  },
  async countPending() {
    const row = db.getFirstSync<{ n: number }>("SELECT COUNT(*) AS n FROM outbox WHERE synced_at IS NULL");
    return row?.n ?? 0;
  },
};

/** Most recent recorded points, for the live list (newest first). */
export function listRecentPoints(limit: number): TrackPoint[] {
  const rows = db.getAllSync<OutboxRow>(
    "SELECT * FROM outbox WHERE kind = 'track_point' ORDER BY created_at DESC LIMIT ?",
    limit,
  );
  const points: TrackPoint[] = [];
  for (const row of rows) {
    const parsed = trackPointSchema.safeParse(JSON.parse(row.payload));
    if (parsed.success) points.push(parsed.data);
  }
  return points;
}

export function countPoints(): number {
  const row = db.getFirstSync<{ n: number }>("SELECT COUNT(*) AS n FROM outbox WHERE kind = 'track_point'");
  return row?.n ?? 0;
}
