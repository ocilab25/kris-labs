import { type OutboxEntry, type OutboxKind, outboxEntrySchema } from "@kris-labs/schemas";

/**
 * Storage adapter the host app implements (SQLite on mobile, Postgres in
 * tests, memory in demos). The engine never touches a database directly so
 * it stays reusable across products.
 */
export interface OutboxStore {
  insert(entry: OutboxEntry): Promise<void>;
  listPending(limit: number): Promise<OutboxEntry[]>;
  markSynced(idempotencyKeys: string[], syncedAt: number): Promise<void>;
  countPending(): Promise<number>;
}

/** Network adapter: delivers a batch, returns the keys the server accepted. */
export interface OutboxTransport {
  send(batch: OutboxEntry[]): Promise<{ acceptedKeys: string[] }>;
}

export interface DrainResult {
  sent: number;
  remaining: number;
}

/**
 * Drain pending entries in batches until the store is empty or a batch is
 * rejected wholesale. Idempotency keys make retries safe: a batch that was
 * delivered but not acknowledged is simply re-sent and deduplicated
 * server-side. Retry/backoff policy arrives with M3.
 */
export async function drainOutbox(
  store: OutboxStore,
  transport: OutboxTransport,
  options: { batchSize?: number; now?: () => number } = {},
): Promise<DrainResult> {
  const batchSize = options.batchSize ?? 50;
  const now = options.now ?? Date.now;
  let sent = 0;
  for (;;) {
    const batch = await store.listPending(batchSize);
    if (batch.length === 0) break;
    const { acceptedKeys } = await transport.send(batch);
    if (acceptedKeys.length === 0) break;
    await store.markSynced(acceptedKeys, now());
    sent += acceptedKeys.length;
    if (acceptedKeys.length < batch.length) break;
  }
  return { sent, remaining: await store.countPending() };
}

/** Build a validated outbox envelope around a domain payload. */
export function createOutboxEntry(
  kind: OutboxKind,
  payload: unknown,
  options: { idempotencyKey?: string; now?: () => number } = {},
): OutboxEntry {
  return outboxEntrySchema.parse({
    idempotencyKey: options.idempotencyKey ?? uuidv4(),
    kind,
    payload,
    createdAt: (options.now ?? Date.now)(),
    syncedAt: null,
  });
}

/**
 * RFC 4122 v4 UUID. Uses the platform CSPRNG when present (Hermes/Node/web);
 * falls back to Math.random, which is acceptable for client-generated
 * idempotency keys but should be swapped for expo-crypto if we ever need
 * unguessable identifiers.
 */
export function uuidv4(): string {
  const bytes = new Uint8Array(16);
  const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = ((bytes[6] as number) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] as number) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
