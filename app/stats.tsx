import React from "react";
import { StyleSheet, Switch, TouchableOpacity } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useGame } from "@/context/game-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function StatsScreen() {
  const { stats, settings, setAutoAdvance, resetStats, setAutoShowHint } =
    useGame();
  const insets = useSafeAreaInsets();
  const accuracy =
    stats.totalGuesses > 0
      ? Math.round((stats.correctCount / stats.totalGuesses) * 100)
      : 0;

  return (
    <ThemedView
      style={[
        styles.container,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 },
      ]}
    >
      <ThemedView style={styles.card}>
        <ThemedText>Total guesses: {stats.totalGuesses}</ThemedText>
        <ThemedText>Correct: {stats.correctCount}</ThemedText>
        <ThemedText>Accuracy: {accuracy}%</ThemedText>
        <ThemedText>Current streak: {stats.currentStreak}</ThemedText>
        <ThemedText>Best streak: {stats.bestStreak}</ThemedText>
      </ThemedView>

      <ThemedText type="subtitle">Controls</ThemedText>
      <ThemedView style={styles.row}>
        <ThemedText style={{ flex: 1 }}>Auto-advance</ThemedText>
        <Switch value={settings.autoAdvance} onValueChange={setAutoAdvance} />
      </ThemedView>

      <ThemedView style={styles.row}>
        <ThemedText style={{ flex: 1 }}>Auto-show hint</ThemedText>
        <Switch value={settings.autoShowHint} onValueChange={setAutoShowHint} />
      </ThemedView>

      <TouchableOpacity onPress={resetStats}>
        <ThemedView style={styles.resetBtn}>
          <ThemedText type="defaultSemiBold">Reset Stats</ThemedText>
        </ThemedView>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  card: {
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  resetBtn: {
    marginTop: 12,
    borderWidth: 2,
    borderColor: "red",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignSelf: "flex-start",
  },
});
