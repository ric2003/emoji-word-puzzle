import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Fonts } from "@/constants/theme";
import { useGame } from "@/context/game-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { isMatch } from "@/utils/answer";
import { getRandomPuzzle, type Puzzle } from "@/utils/puzzles";
import { Link } from "expo-router";

export default function PlayScreen() {
  const scheme = useColorScheme() ?? "light";
  const insets = useSafeAreaInsets();
  const { updateForResult, settings } = useGame();
  const [puzzle, setPuzzle] = useState<Puzzle>(() => getRandomPuzzle());
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<
    "idle" | "near" | "correct" | "wrong"
  >("idle");
  const [hintRequested, setHintRequested] = useState(false);
  const [wrongSinceHint, setWrongSinceHint] = useState(0);
  const [pendingNext, setPendingNext] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const shake = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withTiming(shake.value * 6, { duration: 60 }),
      },
    ],
  }));

  // Feedback overlay animation
  const feedbackOpacity = useSharedValue(0);
  const feedbackAnim = useAnimatedStyle(() => ({
    opacity: feedbackOpacity.value,
    transform: [
      { translateY: (1 - feedbackOpacity.value) * -8 },
      { scale: 0.96 + 0.04 * feedbackOpacity.value },
    ],
  }));
  useEffect(() => {
    feedbackOpacity.value = withTiming(feedback !== "idle" ? 1 : 0, {
      duration: 200,
    });
  }, [feedback]);

  // Auto-dismiss feedback toast; auto-advance only when enabled
  useEffect(() => {
    if (feedback === "idle") return;
    const timer = setTimeout(() => {
      if (feedback === "correct" && settings.autoAdvance) onNext();
      else setFeedback("idle");
    }, 1000);
    return () => clearTimeout(timer);
  }, [feedback, settings.autoAdvance]);

  const difficultyColor = useMemo(() => {
    switch (puzzle.difficulty) {
      case "Hard":
        return "#D97706";
      case "Medium":
        return "#7C3AED";
      default:
        return "#0a7ea4";
    }
  }, [puzzle.difficulty]);

  const categoryLabel = useMemo(() => {
    return (puzzle.Category && puzzle.Category[0]) || "";
  }, [puzzle.Category]);

  const words = useMemo(() => {
    const sanitized = puzzle.answer
      .replace(/[^A-Za-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return sanitized ? sanitized.split(" ") : [];
  }, [puzzle.answer]);

  const [revealMap, setRevealMap] = useState<boolean[][]>([]);

  useEffect(() => {
    setRevealMap(words.map((w) => Array(w.length).fill(false)));
    setHintRequested(!!settings.autoShowHint);
    setWrongSinceHint(0);
  }, [puzzle, words, settings.autoShowHint]);

  // If user toggles autoShowHint while on screen, reflect it immediately
  useEffect(() => {
    if (settings.autoShowHint && !hintRequested) setHintRequested(true);
  }, [settings.autoShowHint]);

  const maskText = useMemo(() => {
    if (!words.length) return "";
    return words
      .map((w, i) =>
        w
          .split("")
          .map((ch, j) => (revealMap[i] && revealMap[i][j] ? ch : "_"))
          .join("")
      )
      .join(" ");
  }, [words, revealMap]);

  function revealWordsFromGuessIfAny(userGuess: string) {
    const guessWords = userGuess
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean);
    if (!guessWords.length || !words.length) return;
    const guessSet = new Set(guessWords);
    setRevealMap((prevMap) => {
      const newMap = prevMap.map((arr) => arr.slice());
      let changed = false;
      for (let i = 0; i < words.length; i++) {
        const answerWord = words[i].toLowerCase();
        if (guessSet.has(answerWord)) {
          for (let j = 0; j < words[i].length; j++) {
            if (!newMap[i][j]) {
              newMap[i][j] = true;
              changed = true;
            }
          }
        }
      }
      return changed ? newMap : prevMap;
    });
  }

  function onSubmit() {
    const { exact, near } = isMatch(guess, puzzle.answer);
    if (exact) {
      setFeedback("correct");
      updateForResult(true);
      // Reveal full answer in the pattern for visual consistency
      setRevealMap(words.map((w) => Array(w.length).fill(true)));
      if (!settings.autoAdvance) setPendingNext(true);
      if (process.env.EXPO_OS === "ios")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Keyboard.dismiss();
    } else if (near) {
      setFeedback("near");
      if (process.env.EXPO_OS === "ios")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      revealWordsFromGuessIfAny(guess);
    } else {
      setFeedback("wrong");
      updateForResult(false);
      if (process.env.EXPO_OS === "ios")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shake.value = withSequence(withTiming(1), withTiming(-1), withTiming(0));
      revealWordsFromGuessIfAny(guess);
      if (hintRequested) {
        // First wrong only shows pattern; start revealing from second wrong
        setWrongSinceHint((prev) => {
          const next = prev + 1;
          if (next >= 2) {
            setRevealMap((prevMap) => {
              const newMap = prevMap.map((arr) => arr.slice());
              if (words.length > 1 && next % 3 === 0) {
                for (let i = 0; i < words.length; i++) {
                  if (!newMap[i]?.every(Boolean)) {
                    for (let j = 0; j < words[i].length; j++)
                      newMap[i][j] = true;
                    return newMap;
                  }
                }
              }
              for (let i = 0; i < words.length; i++) {
                for (let j = 0; j < words[i].length; j++) {
                  if (!newMap[i][j]) {
                    newMap[i][j] = true;
                    return newMap;
                  }
                }
              }
              return newMap;
            });
          }
          return next;
        });
      }
    }
  }

  function onNext() {
    setPuzzle(getRandomPuzzle());
    setGuess("");
    setFeedback("idle");
    setHintRequested(false);
    setWrongSinceHint(0);
    setPendingNext(false);
    inputRef.current?.focus();
  }

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
        },
      ]}
    >
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={{ fontFamily: Fonts.rounded }}>
          Guess it!
        </ThemedText>
        <ThemedView style={styles.headerRight}>
          <ThemedView
            style={[styles.difficultyPill, { borderColor: difficultyColor }]}
          >
            <ThemedText style={{ color: difficultyColor }}>
              {puzzle.difficulty}
            </ThemedText>
          </ThemedView>
          <Link href="/stats" asChild>
            <TouchableOpacity accessibilityLabel="Open stats">
              <IconSymbol
                name="chart.bar.fill"
                size={22}
                color={Colors[scheme].text}
              />
            </TouchableOpacity>
          </Link>
        </ThemedView>
      </ThemedView>

      <Animated.View style={[styles.emojiCard, animatedStyle]}>
        <ThemedText
          accessibilityLabel={`Emoji hint: ${puzzle.puzzle}`}
          style={styles.emoji}
        >
          {puzzle.puzzle}
        </ThemedText>
      </Animated.View>

      <ThemedView style={styles.hintPanel}>
        <ThemedText type="defaultSemiBold">Hints</ThemedText>
        {!hintRequested ? (
          <>
            <TouchableOpacity onPress={() => setHintRequested(true)}>
              <ThemedView style={styles.revealBtn}>
                <ThemedText type="defaultSemiBold">Ask for hint</ThemedText>
              </ThemedView>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <ThemedView style={styles.hintList}>
              <ThemedText>
                Category:{" "}
                <ThemedText type="defaultSemiBold">{categoryLabel}</ThemedText>
              </ThemedText>
              {words.length > 0 &&
                (settings.autoShowHint || wrongSinceHint >= 1) && (
                  <ThemedText>
                    Answer pattern:{" "}
                    <ThemedText type="defaultSemiBold" style={styles.pattern}>
                      {maskText}
                    </ThemedText>
                  </ThemedText>
                )}
            </ThemedView>
          </>
        )}
      </ThemedView>

      <ThemedView style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          value={guess}
          onChangeText={setGuess}
          placeholder="Type your guess"
          placeholderTextColor={scheme === "light" ? "#9BA1A6" : "#687076"}
          style={[styles.input, { color: Colors[scheme].text }]}
          selectionColor={Colors[scheme].tint}
          cursorColor={Colors[scheme].tint}
          onSubmitEditing={onSubmit}
          returnKeyType="send"
          autoCapitalize="words"
          autoCorrect={false}
        />
        {pendingNext ? (
          <TouchableOpacity onPress={onNext}>
            <ThemedView style={styles.cta}>
              <ThemedText type="defaultSemiBold">Next</ThemedText>
            </ThemedView>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onSubmit} disabled={!guess.trim()}>
            <ThemedView
              style={[styles.cta, { opacity: guess.trim() ? 1 : 0.5 }]}
            >
              <ThemedText type="defaultSemiBold">Guess</ThemedText>
            </ThemedView>
          </TouchableOpacity>
        )}
      </ThemedView>

      {feedback !== "idle" && (
        <Animated.View style={[styles.feedbackOverlay, feedbackAnim]}>
          <ThemedView
            style={[
              styles.feedbackCard,
              feedback === "correct"
                ? styles.feedbackSuccess
                : feedback === "wrong"
                ? styles.feedbackError
                : styles.feedbackNear,
            ]}
          >
            <ThemedText type="defaultSemiBold">
              {feedback === "correct" ? "Nice! 🎉" : "Wrong"}
            </ThemedText>
          </ThemedView>
        </Animated.View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  difficultyPill: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  emojiCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    borderRadius: 12,
  },
  emoji: {
    fontSize: 48,
    textAlign: "center",
    lineHeight: 56,
  },
  hintsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  hintChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hintButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hintPanel: {
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  hintList: {
    gap: 4,
  },
  pattern: {
    fontFamily: Fonts.mono,
    letterSpacing: 2,
  },
  revealBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  cta: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  feedback: {
    marginTop: 6,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    gap: 8,
  },
  feedbackOverlay: {
    position: "absolute",
    top: undefined,
    bottom: "50%",
    left: 0,
    right: 0,
    paddingTop: 0,
    alignItems: "center",
    pointerEvents: "box-none",
  },
  feedbackCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  feedbackSuccess: {
    borderColor: "#22C55E",
    backgroundColor: "rgba(34,197,94,0.1)",
  },
  feedbackError: {
    borderColor: "#EF4444",
    backgroundColor: "rgba(239,68,68,0.1)",
  },
  feedbackNear: {
    borderColor: "#F59E0B",
    backgroundColor: "rgba(245,158,11,0.1)",
  },
  nextBtn: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nextBtnOverlay: {
    marginTop: 6,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
