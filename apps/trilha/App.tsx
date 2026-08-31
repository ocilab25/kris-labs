import type { TrackPoint } from "@kris-labs/schemas";
import { palette } from "@kris-labs/ui";
import { addDatabaseChangeListener } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { countPoints, listRecentPoints, sqliteOutboxStore } from "./src/outboxStore";
import { isTracking, requestTrackingPermissions, startTracking, stopTracking } from "./src/tracking";

export default function App() {
  const [recording, setRecording] = useState(false);
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(0);

  const refresh = useCallback(() => {
    setPoints(listRecentPoints(50));
    setTotal(countPoints());
    void sqliteOutboxStore.countPending().then(setPending);
  }, []);

  useEffect(() => {
    void isTracking().then(setRecording);
    refresh();
    // Change hook fires on every outbox insert from the background task;
    // the interval is a belt-and-suspenders fallback.
    const sub = addDatabaseChangeListener((event) => {
      if (event.tableName === "outbox") refresh();
    });
    const timer = setInterval(refresh, 3000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [refresh]);

  const onToggle = useCallback(async () => {
    try {
      if (recording) {
        await stopTracking();
        setRecording(false);
        return;
      }
      const outcome = await requestTrackingPermissions();
      if (outcome === "denied") {
        Alert.alert("Sem permissão", "O Trilha precisa de acesso à localização para gravar.");
        return;
      }
      if (outcome === "foreground-only") {
        Alert.alert(
          "Permissão limitada",
          'Sem "Permitir o tempo todo", a gravação para quando o app sai da tela. Conceda em Configurações para o registro contínuo.',
        );
      }
      await startTracking();
      setRecording(true);
    } catch (e) {
      Alert.alert("Erro", String(e));
    }
  }, [recording]);

  const openBatterySettings = useCallback(() => {
    if (Platform.OS !== "android") return;
    // Doze can throttle location delivery; the user exempts the app here.
    Linking.sendIntent("android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS").catch(() => {
      Alert.alert("Indisponível", "Abra Configurações > Bateria e isente o Trilha manualmente.");
    });
  }, []);

  const last = points[0];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>Trilha</Text>
      <Text style={styles.subtitle}>
        {recording ? "Gravando — funciona offline e com a tela desligada" : "Pronto para gravar"}
      </Text>

      <View style={styles.statsRow}>
        <Stat label="pontos" value={String(total)} />
        <Stat label="pendentes de sync" value={String(pending)} />
        <Stat label="precisão (m)" value={last?.accuracy != null ? last.accuracy.toFixed(0) : "—"} />
      </View>

      <Pressable
        onPress={onToggle}
        style={[styles.button, recording ? styles.buttonStop : styles.buttonStart]}
      >
        <Text style={styles.buttonText}>{recording ? "Parar gravação" : "Iniciar gravação"}</Text>
      </Pressable>

      {Platform.OS === "android" && (
        <Pressable onPress={openBatterySettings}>
          <Text style={styles.link}>Isentar da otimização de bateria (recomendado)</Text>
        </Pressable>
      )}

      <FlatList
        style={styles.list}
        data={points}
        keyExtractor={(p) => p.id}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum ponto ainda.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.coords}>
              {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
            </Text>
            <Text style={styles.meta}>
              {new Date(item.recordedAt).toLocaleTimeString()}
              {item.speed != null ? ` · ${(item.speed * 3.6).toFixed(1)} km/h` : ""}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.paper, paddingTop: 64, paddingHorizontal: 20 },
  title: { fontSize: 32, fontWeight: "700", color: palette.ink },
  subtitle: { fontSize: 14, color: palette.muted, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  stat: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "700", color: palette.ink },
  statLabel: { fontSize: 11, color: palette.muted, marginTop: 2, textAlign: "center" },
  button: { marginTop: 20, borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  buttonStart: { backgroundColor: palette.accent },
  buttonStop: { backgroundColor: palette.danger },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  link: {
    color: palette.muted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
    textDecorationLine: "underline",
  },
  list: { marginTop: 20 },
  empty: { color: palette.muted, textAlign: "center", marginTop: 32 },
  row: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E7EB" },
  coords: { fontSize: 15, color: palette.ink, fontVariant: ["tabular-nums"] },
  meta: { fontSize: 12, color: palette.muted, marginTop: 2 },
});
