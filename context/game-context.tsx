import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type GameStats = {
  correctCount: number;
  totalGuesses: number;
  currentStreak: number;
  bestStreak: number;
};

export type GameSettings = {
  autoAdvance: boolean;
  autoShowHint: boolean;
};

export type GameContextValue = {
  stats: GameStats;
  settings: GameSettings;
  hydrated: boolean;
  updateForResult: (correct: boolean) => void;
  resetStats: () => void;
  setAutoAdvance: (value: boolean) => void;
  setAutoShowHint: (value: boolean) => void;
};

const GameContext = createContext<GameContextValue | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const STATS_KEY = "game:stats:v1";
  const SETTINGS_KEY = "game:settings:v1";

  const [stats, setStats] = useState<GameStats>({
    correctCount: 0,
    totalGuesses: 0,
    currentStreak: 0,
    bestStreak: 0,
  });
  const [settings, setSettings] = useState<GameSettings>({
    autoAdvance: true,
    autoShowHint: true,
  });
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from persistent storage on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [savedStatsRaw, savedSettingsRaw] = await Promise.all([
          AsyncStorage.getItem(STATS_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
        ]);

        if (cancelled) return;

        if (savedStatsRaw) {
          try {
            const parsed = JSON.parse(savedStatsRaw) as Partial<GameStats>;
            setStats((prev) => ({
              correctCount: parsed.correctCount ?? prev.correctCount,
              totalGuesses: parsed.totalGuesses ?? prev.totalGuesses,
              currentStreak: parsed.currentStreak ?? prev.currentStreak,
              bestStreak: parsed.bestStreak ?? prev.bestStreak,
            }));
          } catch {
            // ignore corrupt data and keep defaults
          }
        }

        if (savedSettingsRaw) {
          try {
            const parsed = JSON.parse(
              savedSettingsRaw
            ) as Partial<GameSettings>;
            setSettings((prev) => ({
              autoAdvance:
                typeof parsed.autoAdvance === "boolean"
                  ? parsed.autoAdvance
                  : prev.autoAdvance,
              autoShowHint:
                typeof parsed.autoShowHint === "boolean"
                  ? parsed.autoShowHint
                  : prev.autoShowHint,
            }));
          } catch {
            // ignore corrupt data and keep defaults
          }
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on changes after hydration
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats)).catch(() => {});
  }, [stats, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch(
      () => {}
    );
  }, [settings, hydrated]);

  const updateForResult = useCallback((correct: boolean) => {
    setStats((prev) => {
      const totalGuesses = prev.totalGuesses + 1;
      const correctCount = prev.correctCount + (correct ? 1 : 0);
      const currentStreak = correct ? prev.currentStreak + 1 : 0;
      const bestStreak = Math.max(prev.bestStreak, currentStreak);
      return { correctCount, totalGuesses, currentStreak, bestStreak };
    });
  }, []);

  const resetStats = useCallback(() => {
    setStats({
      correctCount: 0,
      totalGuesses: 0,
      currentStreak: 0,
      bestStreak: 0,
    });
  }, []);

  const setAutoAdvance = useCallback((value: boolean) => {
    setSettings((prev) => ({ ...prev, autoAdvance: value }));
  }, []);

  const setAutoShowHint = useCallback((value: boolean) => {
    setSettings((prev) => ({ ...prev, autoShowHint: value }));
  }, []);

  const value = useMemo(
    () => ({
      stats,
      settings,
      hydrated,
      updateForResult,
      resetStats,
      setAutoAdvance,
      setAutoShowHint,
    }),
    [
      stats,
      settings,
      hydrated,
      updateForResult,
      resetStats,
      setAutoAdvance,
      setAutoShowHint,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
