import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
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
import {
  getPuzzleAt,
  getRandomPuzzle,
  markIndexSeen,
  pickUnseenIndex,
  type Puzzle,
} from "@/utils/puzzles";
import { Link } from "expo-router";
import { Confetti, type ConfettiMethods } from "react-native-fast-confetti";
// Web fallback confetti launcher (canvas-confetti). Loaded lazily on web only.
let webConfetti: null | ((opts?: any) => void) = null;
async function launchWebConfetti() {
  if (webConfetti == null) {
    const mod = await import("canvas-confetti");
    webConfetti = mod.default ?? (mod as any);
  }
  webConfetti?.({
    particleCount: 160,
    spread: 90,
    startVelocity: 45,
    ticks: 200,
    origin: { y: 0.2 },
    colors: ["#ff6b6b", "#4ecdc4", "#45b7d1", "#f9ca24", "#f0932b"],
  });
}

export default function PlayScreen() {
  const scheme = useColorScheme() ?? "light";
  const insets = useSafeAreaInsets();
  const { updateForResult, settings } = useGame();
  const [puzzle, setPuzzle] = useState<Puzzle>(() => getRandomPuzzle());
  const currentIndexRef = useRef<number | null>(null);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<
    "idle" | "near" | "correct" | "wrong"
  >("idle");
  const [hintRequested, setHintRequested] = useState(false);
  const [wrongSinceHint, setWrongSinceHint] = useState(0);
  const [pendingNext, setPendingNext] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const confettiRef = useRef<ConfettiMethods>(null);
  const isNative = Platform.OS === "ios" || Platform.OS === "android";

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

  // Load a unique puzzle on mount (do not mark as seen yet)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const idx = await pickUnseenIndex();
      if (cancelled) return;
      currentIndexRef.current = idx;
      setPuzzle(getPuzzleAt(idx));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Track keyboard visibility to compress bottom spacing (helps on iOS Safari)
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

  const patternText = useMemo(() => {
    if (!words.length) return "";
    const raw = puzzle.answer;
    let wordIndex = 0;
    let charIndex = 0;
    const out: string[] = [];
    for (let k = 0; k < raw.length; k++) {
      const ch = raw[k];
      if (/[A-Za-z0-9]/.test(ch)) {
        const revealed = !!revealMap[wordIndex]?.[charIndex];
        out.push(revealed ? ch : "_");
        charIndex++;
        if (charIndex >= (words[wordIndex]?.length ?? 0)) {
          wordIndex++;
          charIndex = 0;
        }
      } else if (ch === "-") {
        out.push("-");
      } else if (/\s/.test(ch)) {
        out.push(" ");
      } else {
        // Other punctuation shown as space to avoid confusion
        out.push(" ");
      }
    }
    return out.join("");
  }, [puzzle.answer, words, revealMap]);

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
      // Celebrate with confetti when enabled
      if (settings.confettiEnabled) {
        if (isNative) {
          confettiRef.current?.restart({
            cannonsPositions: [
              { x: 50, y: 100 },
              { x: Dimensions.get("window").width - 50, y: 100 },
            ],
          });
        } else if (Platform.OS === "web") {
          // Web: use canvas-confetti fallback
          launchWebConfetti();
        }
      }
      Keyboard.dismiss();
      // Mark current puzzle as seen on success
      if (currentIndexRef.current != null)
        markIndexSeen(currentIndexRef.current);
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

  async function onNext() {
    // If we are advancing after a guess (correct or wrong), mark as seen only if correct
    // Note: wrong guesses don't mark as seen to allow it to reappear later
    const idx = await pickUnseenIndex(
      currentIndexRef.current != null ? [currentIndexRef.current] : undefined
    );
    currentIndexRef.current = idx;
    setPuzzle(getPuzzleAt(idx));
    setGuess("");
    setFeedback("idle");
    setHintRequested(false);
    setWrongSinceHint(0);
    setPendingNext(false);
    inputRef.current?.focus();
  }

  // Explicit Skip action: load another unseen puzzle but don't mark current as seen
  async function onSkip() {
    const idx = await pickUnseenIndex(
      currentIndexRef.current != null ? [currentIndexRef.current] : undefined
    );
    currentIndexRef.current = idx;
    setPuzzle(getPuzzleAt(idx));
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
          paddingBottom: isKeyboardVisible ? 0 : insets.bottom + 8,
        },
        isKeyboardVisible && { gap: 8 },
      ]}
    >
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={{ fontFamily: Fonts.rounded }}>
          Guess it!
        </ThemedText>
        <ThemedView style={styles.headerRight}>
          <Link href="/stats" asChild>
            <TouchableOpacity
              accessibilityLabel="Open stats"
              accessibilityHint="Opens your gameplay statistics"
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.statsBtn}
            >
              <IconSymbol
                name="chart.bar.fill"
                size={28}
                color={Colors[scheme].text}
              />
              <ThemedText type="defaultSemiBold">Stats</ThemedText>
            </TouchableOpacity>
          </Link>
        </ThemedView>
      </ThemedView>

      {/* Difficulty pill above emoji card */}
      <ThemedView style={styles.difficultyContainer}>
        <ThemedView
          style={[styles.difficultyPill, { borderColor: difficultyColor }]}
        >
          <ThemedText style={{ color: difficultyColor }}>
            {puzzle.difficulty}
          </ThemedText>
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

      {!hintRequested ? (
        <>
          <TouchableOpacity onPress={() => setHintRequested(true)}>
            <ThemedView
              style={[styles.revealBtn, { borderColor: Colors[scheme].icon }]}
            >
              <ThemedText type="defaultSemiBold">Ask for hint</ThemedText>
            </ThemedView>
          </TouchableOpacity>
        </>
      ) : (
        <ThemedView
          style={[styles.hintPanel, { borderColor: Colors[scheme].icon }]}
        >
          <ThemedView style={styles.hintList}>
            <ThemedText>
              Category:{" "}
              <ThemedText type="defaultSemiBold">{categoryLabel}</ThemedText>
            </ThemedText>
            {words.length > 0 &&
              (settings.autoShowHint || wrongSinceHint >= 1) && (
                <ThemedText>
                  {" "}
                  <ThemedText type="defaultSemiBold" style={styles.pattern}>
                    {patternText}
                  </ThemedText>
                </ThemedText>
              )}
          </ThemedView>
        </ThemedView>
      )}

      <ThemedView
        style={[styles.controls, { borderColor: Colors[scheme].icon }]}
      >
        <TextInput
          ref={inputRef}
          value={guess}
          onChangeText={setGuess}
          placeholder="Type your guess"
          placeholderTextColor={scheme === "light" ? "#9BA1A6" : "#687076"}
          style={[
            styles.input,
            {
              color: Colors[scheme].text,
              borderBottomWidth: 0.5,
              borderBottomColor: Colors[scheme].icon,
              backgroundColor: Colors[scheme].background,
            },
          ]}
          selectionColor={Colors[scheme].tint}
          cursorColor={Colors[scheme].tint}
          onSubmitEditing={onSubmit}
          returnKeyType="send"
          autoCapitalize="words"
          autoCorrect={false}
          onFocus={() => setIsKeyboardVisible(true)}
          onBlur={() => setIsKeyboardVisible(false)}
        />

        <ThemedView style={styles.controlsButtonsRow}>
          {pendingNext ? (
            <TouchableOpacity onPress={onNext} style={{ flex: 1 }}>
              <ThemedView
                style={[styles.action, { borderTopColor: Colors[scheme].icon }]}
              >
                <ThemedText type="defaultSemiBold">Next</ThemedText>
              </ThemedView>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity onPress={onSkip} style={{ flex: 1 }}>
                <ThemedView
                  style={[
                    styles.action,
                    { borderTopColor: Colors[scheme].icon },
                  ]}
                >
                  <ThemedText type="defaultSemiBold">Skip</ThemedText>
                </ThemedView>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onSubmit}
                disabled={!guess.trim()}
                style={{ flex: 1 }}
              >
                <ThemedView
                  style={[
                    styles.action,
                    styles.actionSplit,
                    {
                      opacity: guess.trim() ? 1 : 0.5,
                      borderTopColor: Colors[scheme].icon,
                      borderLeftColor: Colors[scheme].icon,
                    },
                  ]}
                >
                  <ThemedText type="defaultSemiBold">Guess</ThemedText>
                </ThemedView>
              </TouchableOpacity>
            </>
          )}
        </ThemedView>
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

      {/* Confetti overlay (native only) */}
      {isNative && settings.confettiEnabled && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Confetti
            ref={confettiRef}
            count={150}
            colors={["#ff6b6b", "#4ecdc4", "#45b7d1", "#f9ca24", "#f0932b"]}
            flakeSize={{ width: 10, height: 10 }}
            fallDuration={5000}
            autoplay={false}
            isInfinite={false}
          />
        </View>
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
  statsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 10,
  },
  tapTarget: {
    minWidth: 44,
    minHeight: 44,
    padding: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  difficultyPill: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  difficultyContainer: {
    alignItems: "center",
  },
  emojiCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 24,
  },
  emoji: {
    fontSize: 72,
    textAlign: "center",
    lineHeight: 80,
  },
  hintsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
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
    alignItems: "center",
  },
  hintList: {
    gap: 4,
    alignItems: "center",
  },
  pattern: {
    fontFamily: Fonts.mono,
    letterSpacing: 2,
  },
  revealBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    width: "100%",
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    width: "100%",
  },
  controls: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
  },
  controlsButtonsRow: {
    flexDirection: "row",
  },
  action: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  actionSplit: {
    borderLeftWidth: 1,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    minHeight: 16,
  },
  cta: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryCta: {
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
    bottom: "60%",
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "box-none",
  },
  feedbackCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 32,
    paddingVertical: 16,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  feedbackSuccess: {
    borderColor: "#22C55E",
    backgroundColor: "rgba(34,197,94,0.8)",
  },
  feedbackError: {
    borderColor: "#EF4444",
    backgroundColor: "rgba(239,68,68,0.8)",
  },
  feedbackNear: {
    borderColor: "#F59E0B",
    backgroundColor: "rgba(245,158,11,0.8)",
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
