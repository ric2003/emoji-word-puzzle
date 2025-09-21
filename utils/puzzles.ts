export type Difficulty = "Easy" | "Medium" | "Hard";

export type Puzzle = {
  puzzle: string;
  answer: string;
  Category: string[];
  difficulty: Difficulty;
};

import puzzlesData from "@/assets/data/puzzles.json";

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
