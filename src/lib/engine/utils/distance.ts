/**
 * Computes the Levenshtein distance between two strings.
 * Used to measure structural similarity between verses.
 */
export const levenshteinDistance = (s1: string, s2: string): number => {
  if (s1.length < s2.length) return levenshteinDistance(s2, s1);
  if (s2.length === 0) return s1.length;

  let prevRow = Array.from({ length: s2.length + 1 }, (_, i) => i);

  for (let i = 0; i < s1.length; i++) {
    const currRow = [i + 1];
    for (let j = 0; j < s2.length; j++) {
      const insertions = prevRow[j + 1] + 1;
      const deletions = currRow[j] + 1;
      const substitutions = prevRow[j] + (s1[i] !== s2[j] ? 1 : 0);
      currRow.push(Math.min(insertions, deletions, substitutions));
    }
    prevRow = currRow;
  }

  return prevRow[s2.length];
};

/**
 * Normalizes and calculates distance between two Arabic strings, 
 * optionally ignoring stop words for a more semantic "Mutashabihat" distance.
 */
export const calculateVerseDistance = (v1: string, v2: string): number => {
    // We expect normalized strings here
    return levenshteinDistance(v1, v2);
};
