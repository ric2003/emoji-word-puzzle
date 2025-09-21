import React, {
  createContext,
  useCallback,
  useContext,
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
  updateForResult: (correct: boolean) => void;
  resetStats: () => void;
  setAutoAdvance: (value: boolean) => void;
  setAutoShowHint: (value: boolean) => void;
};

const GameContext = createContext<GameContextValue | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<GameStats>({
    correctCount: 0,
    totalGuesses: 0,
    currentStreak: 0,
    bestStreak: 0,
  });
  const [settings, setSettings] = useState<GameSettings>({
    autoAdvance: true,
    autoShowHint: false,
  });

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
      updateForResult,
      resetStats,
      setAutoAdvance,
      setAutoShowHint,
    }),
    [
      stats,
      settings,
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
