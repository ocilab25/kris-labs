import { z } from "zod";

/** A single GPS fix recorded on-device. Times are epoch milliseconds (UTC). */
export const trackPointSchema = z.object({
  id: z.uuid(),
  trackId: z.uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().nullable(),
  /** Horizontal accuracy radius in meters, as reported by the platform. */
  accuracy: z.number().nonnegative().nullable(),
  /** Ground speed in m/s; null when the platform can't estimate it. */
  speed: z.number().nullable(),
  /** Course over ground in degrees [0, 360); null when stationary/unknown. */
  heading: z.number().nullable(),
  recordedAt: z.number().int().positive(),
});
export type TrackPoint = z.infer<typeof trackPointSchema>;

/** A recording session: one continuous logging run. */
export const trackSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(200).nullable(),
  startedAt: z.number().int().positive(),
  endedAt: z.number().int().positive().nullable(),
});
export type Track = z.infer<typeof trackSchema>;

/** Kinds of records the outbox can hold. Extend as new entities appear. */
export const outboxKindSchema = z.enum(["track", "track_point"]);
export type OutboxKind = z.infer<typeof outboxKindSchema>;

/**
 * Store-and-forward envelope. `idempotencyKey` is stable across retries so
 * the server can deduplicate; `payload` is validated against the schema for
 * its `kind` at the sync boundary, not at write time (writes must never fail
 * in the field).
 */
export const outboxEntrySchema = z.object({
  idempotencyKey: z.uuid(),
  kind: outboxKindSchema,
  payload: z.unknown(),
  createdAt: z.number().int().positive(),
  syncedAt: z.number().int().positive().nullable(),
});
export type OutboxEntry = z.infer<typeof outboxEntrySchema>;

export const payloadSchemaByKind = {
  track: trackSchema,
  track_point: trackPointSchema,
} as const satisfies Record<OutboxKind, z.ZodType>;
