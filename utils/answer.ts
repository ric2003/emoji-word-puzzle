export function normalizeAnswer(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  const v0 = new Array(bLen + 1).fill(0);
  const v1 = new Array(bLen + 1).fill(0);

  for (let i = 0; i <= bLen; i++) v0[i] = i;

  for (let i = 0; i < aLen; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < bLen; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= bLen; j++) v0[j] = v1[j];
  }

  return v1[bLen];
}

export function isMatch(
  user: string,
  correct: string
): { exact: boolean; near: boolean } {
  const u = normalizeAnswer(user);
  const c = normalizeAnswer(correct);
  if (!u) return { exact: false, near: false };
  if (u === c) return { exact: true, near: false };

  const dist = levenshteinDistance(u, c);
  const threshold = Math.max(1, Math.min(3, Math.floor(c.length * 0.15)));
  return { exact: false, near: dist <= threshold };
}
