import { trackPointSchema } from "@kris-labs/schemas";
import { createOutboxEntry, uuidv4 } from "@kris-labs/sync";
import type * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { db, getActiveTrackId } from "./db";

export const LOCATION_TASK = "trilha-location-task";

interface LocationTaskData {
  locations: Location.LocationObject[];
}

/**
 * Headless consumer of the Android foreground-service location stream.
 * Must be defined at module scope (imported from index.ts) so the task
 * runtime finds it even when no React tree is mounted. Writes must never
 * throw: a lost point is recoverable, a crashed task is not.
 */
TaskManager.defineTask<LocationTaskData>(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn(`[locationTask] ${error.message}`);
    return;
  }
  if (!data?.locations?.length) return;

  const trackId = getActiveTrackId();
  if (!trackId) return;

  for (const location of data.locations) {
    try {
      const point = trackPointSchema.parse({
        id: uuidv4(),
        trackId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude ?? null,
        accuracy: location.coords.accuracy ?? null,
        speed: location.coords.speed ?? null,
        heading: location.coords.heading ?? null,
        recordedAt: Math.round(location.timestamp),
      });
      const entry = createOutboxEntry("track_point", point);
      db.runSync(
        "INSERT OR IGNORE INTO outbox (idempotency_key, kind, payload, created_at, synced_at) VALUES (?, ?, ?, ?, ?)",
        entry.idempotencyKey,
        entry.kind,
        JSON.stringify(entry.payload),
        entry.createdAt,
        entry.syncedAt,
      );
    } catch (e) {
      console.warn(`[locationTask] dropped point: ${String(e)}`);
    }
  }
});
