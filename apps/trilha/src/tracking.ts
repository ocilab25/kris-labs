import { uuidv4 } from "@kris-labs/sync";
import * as Location from "expo-location";
import { db, getActiveTrackId, setActiveTrackId } from "./db";
import { LOCATION_TASK } from "./locationTask";

export type PermissionOutcome = "granted" | "foreground-only" | "denied";

/**
 * Two-step Android flow: background permission can only be requested after
 * foreground is granted (Android 11+ sends the user to system settings).
 */
export async function requestTrackingPermissions(): Promise<PermissionOutcome> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") return "denied";
  const background = await Location.requestBackgroundPermissionsAsync();
  return background.status === "granted" ? "granted" : "foreground-only";
}

export async function startTracking(): Promise<string> {
  const trackId = uuidv4();
  db.runSync(
    "INSERT INTO tracks (id, name, started_at, ended_at) VALUES (?, ?, ?, NULL)",
    trackId,
    null,
    Date.now(),
  );
  setActiveTrackId(trackId);

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 2000,
    distanceInterval: 0,
    // Android: promotes the task to a foreground service with a persistent
    // notification — the piece that keeps logging alive with the screen off.
    foregroundService: {
      notificationTitle: "Trilha — gravando",
      notificationBody: "Registrando pontos GPS, mesmo offline e com a tela desligada.",
      killServiceOnDestroy: false,
    },
  });
  return trackId;
}

export async function stopTracking(): Promise<void> {
  const active = getActiveTrackId();
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
  if (active) {
    db.runSync("UPDATE tracks SET ended_at = ? WHERE id = ?", Date.now(), active);
    setActiveTrackId(null);
  }
}

export async function isTracking(): Promise<boolean> {
  return (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) && getActiveTrackId() !== null;
}
