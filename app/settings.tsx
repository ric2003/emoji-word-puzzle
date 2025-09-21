import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView
      style={[
        styles.container,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 },
      ]}
    >
      <ThemedText type="title">Settings</ThemedText>

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
  navRow: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});
