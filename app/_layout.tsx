import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { Colors } from "@/constants/theme";
import { GameProvider } from "@/context/game-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { SafeAreaProvider } from "react-native-safe-area-context";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider
      style={{
        flex: 1,
        backgroundColor: Colors[colorScheme ?? "light"].background,
      }}
    >
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <GameProvider>
          <Stack
            screenOptions={{
              contentStyle: {
                backgroundColor: Colors[colorScheme ?? "light"].background,
              },
              headerStyle: {
                backgroundColor: Colors[colorScheme ?? "light"].background,
              },
              headerTitleStyle: {
                color: Colors[colorScheme ?? "light"].text,
              },
              headerTintColor: Colors[colorScheme ?? "light"].text,
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen
              name="(tabs)"
              options={{ headerShown: false, title: "Play" }}
            />
            <Stack.Screen
              name="settings"
              options={{ title: "Settings", headerBackTitle: "Play" }}
            />
            <Stack.Screen
              name="stats"
              options={{ title: "Stats", headerBackTitle: "Settings" }}
            />
            <Stack.Screen
              name="modal"
              options={{ presentation: "modal", title: "Modal" }}
            />
          </Stack>
          <StatusBar style="auto" />
        </GameProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
