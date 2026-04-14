import { normalizeArabic, stripCommonPrefixes } from '../utils/normalization';
import { getUncommonTokens } from '../utils/tokenization';
import { levenshteinDistance } from '../utils/distance';
import type { 
  VerseInput, 
  ScoredVerse, 
  WordMap, 
  MorphologyAya, 
  AdvancedSearchOptions, 
  MatchType 
} from '../types';

export const performSimilaritySearch = <TVerse extends VerseInput>(
  query: string,
  quranData: Map<number, TVerse>,
  options: AdvancedSearchOptions,
  wordMap: WordMap,
  morphologyMap: Map<number, MorphologyAya>
): ScoredVerse<TVerse>[] => {
  const cleanQuery = normalizeArabic(query);
  const uncommonQueryTokens = getUncommonTokens(cleanQuery);
  
  if (uncommonQueryTokens.length === 0) return [];

  const results: ScoredVerse<TVerse>[] = [];

  // Optimization: Pre-calculate query token variants
  const queryTokenVariants = uncommonQueryTokens.map(t => ({
    token: t,
    variants: stripCommonPrefixes(t)
  }));

  for (const verse of quranData.values()) {
    const cleanVerse = normalizeArabic(verse.standard);
    const verseWords = cleanVerse.split(/\s+/);
    
    // Quick check: If the verse is very short and the query is long, or vice versa, 
    // we still check overlap but might penalize later.
    
    let sharedCount = 0;
    const matchedTokens: string[] = [];
    const tokenTypes: Record<string, MatchType> = {};
    
    // Group all possible stripped variants of all words in the verse for fast lookup
    const verseWordVariants = new Set<string>();
    for (const vWord of verseWords) {
      const variants = stripCommonPrefixes(vWord);
      for (const v of variants) verseWordVariants.add(v);
    }
    
    for (const { token: qToken, variants: qVariants } of queryTokenVariants) {
      let found = false;

      // Priority 1: Exact or any prefix variant match
      for (const qv of qVariants) {
        if (verseWords.includes(qv) || verseWordVariants.has(qv)) {
          sharedCount += (qv === qToken) ? 1.0 : 0.9;
          matchedTokens.push(qToken);
          tokenTypes[qToken] = 'exact';
          found = true;
          break;
        }
      }
      
      if (found) continue;

      // Priority 2: Linguistic match (sharing same lemma or root)
      let entry = null;
      for (const qv of qVariants) {
        entry = wordMap.get(qv);
        if (entry) break;
      }

      if (entry) {
        const morph = morphologyMap.get(verse.gid);
        if (morph) {
          if (options.lemma && entry.lemma && morph.lemmas.some(l => normalizeArabic(l) === normalizeArabic(entry.lemma))) {
            sharedCount += 0.95;
            matchedTokens.push(qToken);
            tokenTypes[qToken] = 'lemma';
            found = true;
          }
          else if (options.root && entry.root && morph.roots.some(r => normalizeArabic(r) === normalizeArabic(entry.root))) {
            sharedCount += 0.9;
            matchedTokens.push(qToken);
            tokenTypes[qToken] = 'root';
            found = true;
          }
        }
      }

      if (found) continue;

      // Priority 3: Fuzzy fallback
      if (qToken.length > 5) {
        for (const vWord of verseWords) {
          if (vWord.length > 5 && levenshteinDistance(qToken, vWord) === 1) {
            sharedCount += 0.8;
            matchedTokens.push(qToken);
            tokenTypes[qToken] = 'fuzzy';
            break;
          }
        }
      }
    }

    // 2. Overlap Threshold: 
    // Mutashabihat are often partial matches.
    const overlapRatio = sharedCount / uncommonQueryTokens.length;
    
    // Relaxed threshold: high overlap ratio OR significant raw count
    const isStrongOverlap = overlapRatio >= 0.7 || (uncommonQueryTokens.length >= 5 && sharedCount >= 3);
    const isModerateOverlap = overlapRatio >= 0.4 && sharedCount >= 1.8;

    if (isStrongOverlap || isModerateOverlap) {
      // 3. Structural distance with segment-awareness
      const distance = levenshteinDistance(cleanQuery, cleanVerse);
      
      // If overlap is strong, we are MUCH more tolerant of distance (e.g. Al-Isra 31 vs query)
      const lengthDiff = Math.abs(cleanQuery.length - cleanVerse.length);
      const isContained = cleanVerse.includes(cleanQuery) || cleanQuery.includes(cleanVerse);
      
      // Logic: If it's a strong overlap and the distance is mostly due to length difference
      // (one verse being a segment of the other), we allow it.
      const toleranceRatio = isStrongOverlap ? 2.5 : 1.2;
      const maxAllowedDistance = Math.max(50, cleanQuery.length * toleranceRatio);

      if (distance < maxAllowedDistance || isContained || (sharedCount >= 3.5 && distance < 200) || (overlapRatio > 0.9 && distance < 400)) {
        // Scoring: Boosted to compete with linguistic matches
        // Base score: 5-10
        const baseScore = 5 + (overlapRatio * 5);
        // Penalty for distance, but reduced if it's a strong overlap
        const distancePenalty = (distance / Math.max(30, cleanQuery.length)) * (isStrongOverlap ? 1 : 2);
        
        results.push({
          ...verse,
          matchScore: Math.max(2, baseScore - distancePenalty), // Minimum 2 to stay relevant
          matchType: 'similarity',
          matchedTokens: Array.from(new Set(matchedTokens)),
          tokenTypes
        } as ScoredVerse<TVerse>);
      }
    }
  }

  // Sort by match score within the layer
  return results.sort((a, b) => b.matchScore - a.matchScore);
};
