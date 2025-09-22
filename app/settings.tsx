import React from "react";
import { StyleSheet, Switch, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useGame } from "@/context/game-context";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, setAutoAdvance, setAutoShowHint, setConfettiEnabled } =
    useGame();

  return (
    <ThemedView
      style={[
        styles.container,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 },
      ]}
    >
      <ThemedText type="title">Settings</ThemedText>

      <View style={styles.rowBetween}>
        <ThemedText>Auto advance on correct</ThemedText>
        <Switch value={settings.autoAdvance} onValueChange={setAutoAdvance} />
      </View>

      <View style={styles.rowBetween}>
        <ThemedText>Auto show hint</ThemedText>
        <Switch value={settings.autoShowHint} onValueChange={setAutoShowHint} />
      </View>

      <View style={styles.rowBetween}>
        <ThemedText>Confetti celebration</ThemedText>
        <Switch
          value={settings.confettiEnabled}
          onValueChange={setConfettiEnabled}
        />
      </View>

      <Link href="/stats" asChild>
        <TouchableOpacity accessibilityLabel="View stats">
          <ThemedView style={styles.navRow}>
            <ThemedText type="defaultSemiBold">View Stats</ThemedText>
          </ThemedView>
        </TouchableOpacity>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navRow: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});
