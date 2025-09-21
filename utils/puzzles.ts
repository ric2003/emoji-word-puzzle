export type Difficulty = "Easy" | "Medium" | "Hard";

export type Puzzle = {
  puzzle: string;
  answer: string;
  Category: string[];
  difficulty: Difficulty;
};

import puzzlesData from "@/assets/data/puzzles.json";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const puzzles: Puzzle[] = puzzlesData as unknown as Puzzle[];

export function getRandomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

export function getRandomPuzzle(): Puzzle {
  return puzzles[getRandomIndex(puzzles.length)];
}

export function getPuzzlesByDifficulty(difficulty?: Difficulty): Puzzle[] {
  if (!difficulty) return puzzles;
  return puzzles.filter((p) => p.difficulty === difficulty);
}

// Persistent, non-repeating puzzle rotation
const STORAGE_KEY = "seenPuzzleIndexes:v1";

async function readSeenSet(): Promise<Set<number>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr: number[] = JSON.parse(raw);
    return new Set(arr);
  } catch {
    return new Set();
  }
}

async function writeSeenSet(seen: Set<number>): Promise<void> {
  try {
    const arr = Array.from(seen);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

export async function getNextUniquePuzzle(): Promise<Puzzle> {
  const total = puzzles.length;
  const seen = await readSeenSet();

  // Reset when all seen
  if (seen.size >= total) {
    seen.clear();
  }

  // Collect unseen indexes
  const unseen: number[] = [];
  for (let i = 0; i < total; i++) {
    if (!seen.has(i)) unseen.push(i);
  }

  // Fallback to random if something odd
  if (unseen.length === 0) return getRandomPuzzle();

  // Pick random from unseen
  const pick = unseen[getRandomIndex(unseen.length)];
  seen.add(pick);
  await writeSeenSet(seen);
  return puzzles[pick];
}

export async function resetSeenPuzzles(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// New helpers for fine-grained control (e.g., skip without marking seen)
export async function pickUnseenIndex(
  excludeIndexes?: number[]
): Promise<number> {
  const total = puzzles.length;
  const seen = await readSeenSet();
  // If all have been seen, treat as reset for the purposes of picking
  const candidates: number[] = [];
  if (seen.size >= total) {
    for (let i = 0; i < total; i++) candidates.push(i);
  } else {
    for (let i = 0; i < total; i++) if (!seen.has(i)) candidates.push(i);
  }
  if (candidates.length === 0) return getRandomIndex(total);
  const excludes = new Set((excludeIndexes ?? []).map((i) => i % total));
  const filtered = candidates.filter((i) => !excludes.has(i));
  const pool = filtered.length > 0 ? filtered : candidates;
  return pool[getRandomIndex(pool.length)];
}

export function getPuzzleAt(index: number): Puzzle {
  return puzzles[index % puzzles.length];
}

export async function markIndexSeen(index: number): Promise<void> {
  const seen = await readSeenSet();
  seen.add(index % puzzles.length);
  await writeSeenSet(seen);
}
