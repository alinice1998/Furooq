/**
 * Furooq Quran Search Engine (Standalone Core)
 * Updated with Fuzzy Search and Dynamic Similarity Discovery
 */
const Engine = (() => {
    let context = {
        quranData: null,
        morphologyMap: null,
        wordMap: null,
        semanticMap: null,
        phoneticMap: null,
        invertedIndex: null,
        similarities: null,
        similarIndex: null
    };

    const normalizeArabic = (text) => {
        if (!text) return '';
        return text
            .replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06FC]/g, "") // Remove Tashkeel and Quranic marks
            .replace(/[إأآٱ]/g, "ا")
            .replace(/[ؤئء]/g, "ء")
            .replace(/ة/g, "ه")
            .replace(/ى/g, "ي")
            .replace(/[^\u0621-\u064A\s-]+/g, '') // Remove non-Arabic
            .replace(/\s{2,}/g, ' ')
            .trim();
    };

    const ARABIC_STOP_WORDS = new Set([
        'في', 'من', 'على', 'إلى', 'إلا', 'هو', 'هي', 'ذا', 'الذي', 'الذين', 
        'ما', 'إن', 'أن', 'إنما', 'لي', 'لك', 'له', 'لهم', 'كم', 'منهم', 
        'عن', 'قد', 'ذلك', 'هذا', 'هذه', 'هؤلاء', 'إذ', 'إذا', 'إذما', 'لو', 
        'لولا', 'لوما', 'كل', 'بعض', 'أي', 'بم', 'فلما', 'ثم', 'أو', 'أم', 'حتى',
        'و', 'ف', 'ب', 'ل', 'ك', 'لا'
    ]);

    const isStopWord = (word) => {
        return ARABIC_STOP_WORDS.has(normalizeArabic(word));
    };

    const stripCommonPrefixes = (word) => {
        if (!word || word.length <= 3) return [word];
        const results = new Set();
        results.add(word);
        const prefixes = ['بال', 'وال', 'فال', 'لل', 'ال', 'و', 'ف', 'ب', 'ل', 'ك'];
        for (const prefix of prefixes) {
            if (word.startsWith(prefix) && word.length > prefix.length + 2) {
                const stripped = word.substring(prefix.length);
                results.add(stripped);
                const recursiveMatches = stripCommonPrefixes(stripped);
                recursiveMatches.forEach((m) => results.add(m));
            }
        }
        return Array.from(results);
    };

    const levenshteinDistance = (s1, s2) => {
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

    const loadData = async (url) => {
        try {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`);
            return await resp.json();
        } catch (e) {
            console.error(`Error loading data from ${url}:`, e);
            throw e;
        }
    };

    const buildInvertedIndex = (morphologyArray, quranArray) => {
        const lemmaIndex = new Map();
        const rootIndex = new Map();
        const wordIndex = new Map();

        if (Array.isArray(morphologyArray)) {
            morphologyArray.forEach(item => {
                const gid = item.gid;
                if (item.lemmas) {
                    item.lemmas.forEach(lemma => {
                        if (!lemmaIndex.has(lemma)) lemmaIndex.set(lemma, new Set());
                        lemmaIndex.get(lemma).add(gid);
                    });
                }
                if (item.roots) {
                    item.roots.forEach(root => {
                        if (!rootIndex.has(root)) rootIndex.set(root, new Set());
                        rootIndex.get(root).add(gid);
                    });
                }
            });
        }

        if (Array.isArray(quranArray)) {
            quranArray.forEach(verse => {
                const normalized = normalizeArabic(verse.standard);
                const words = normalized.split(/\s+/);
                words.forEach(word => {
                    if (!word) return;
                    if (!wordIndex.has(word)) wordIndex.set(word, new Set());
                    wordIndex.get(word).add(verse.gid);
                });
            });
        }

        return { lemmaIndex, rootIndex, wordIndex };
    };

    const findDynamicSimilars = (gid, intensity = 5) => {
        const verse = context.quranData.get(gid);
        if (!verse) return [];
        
        const cleanText = normalizeArabic(verse.standard);
        const tokens = cleanText.split(/\s+/).filter(t => t && !isStopWord(t));
        if (tokens.length === 0) return [];

        // Sensitivity mapping (intensity 1-10)
        // 1: Very loose (1.5 words), 10: Extremely strict (5.5 words)
        const phraseThreshold = 1.0 + (intensity * 0.4); 
        // 1: Very loose (20%), 10: Extremely strict (80%)
        const targetOverlapThreshold = 0.1 + (intensity * 0.07);
        const globalOverlapThreshold = 0.1 + (intensity * 0.05);
        
        const { wordIndex, lemmaIndex } = context.invertedIndex;
        const potentialGids = new Map(); // gid -> weight
        const uniqueTokens = new Set(tokens);
        uniqueTokens.forEach(token => {
            const variants = stripCommonPrefixes(token);
            const entry = context.wordMap[token] || (variants[1] ? context.wordMap[variants[1]] : null);
            
            // Influence weight by how common the word is (Inverse Document Frequency)
            const firstVariant = variants[0];
            const wordUsageCount = (wordIndex.get(firstVariant) || new Set()).size;
            const weight = wordUsageCount > 100 ? 0.4 : (wordUsageCount > 20 ? 0.7 : 1.0);

            // Direct word matches
            variants.forEach(v => {
                const gids = wordIndex.get(v) || new Set();
                gids.forEach(g => {
                    if (g === gid) return;
                    potentialGids.set(g, (potentialGids.get(g) || 0) + weight);
                });
            });

            // Lemma matches
            if (entry && entry.lemma) {
                const lemmaUsageCount = (lemmaIndex.get(entry.lemma) || new Set()).size;
                const lemmaWeight = lemmaUsageCount > 100 ? 0.3 : (lemmaUsageCount > 20 ? 0.5 : 0.8);
                
                const gids = lemmaIndex.get(entry.lemma) || new Set();
                gids.forEach(g => {
                    if (g === gid) return;
                    if (!potentialGids.has(g)) potentialGids.set(g, (potentialGids.get(g) || 0) + lemmaWeight);
                });
            }
        });

        const results = [];
        const cleanQuery = cleanText;

        for (const [otherGid, sharedCount] of potentialGids.entries()) {
            const otherVerse = context.quranData.get(otherGid);
            const cleanVerse = normalizeArabic(otherVerse.standard);
            const otherTokens = cleanVerse.split(/\s+/).filter(t => t && !isStopWord(t));
            const overlapRatio = sharedCount / uniqueTokens.size;
            const otherOverlapRatio = sharedCount / otherTokens.length;

            // Strict Segment-based similarity based on selected intensity
            const isVeryHighTargetOverlap = otherOverlapRatio >= targetOverlapThreshold && sharedCount >= 1.8;
            const isSignificantPhrase = sharedCount >= phraseThreshold;

            if (overlapRatio < globalOverlapThreshold && !isVeryHighTargetOverlap && !isSignificantPhrase) continue;

            const distance = levenshteinDistance(cleanQuery, cleanVerse);
            const isStrongOverlap = overlapRatio >= 0.7;
            const isContained = cleanVerse.includes(cleanQuery) || cleanQuery.includes(cleanVerse);
            
            // Using the optimized thresholds found in diagnostics
            const toleranceRatio = isStrongOverlap ? 2.5 : 1.2;
            const maxAllowedDistance = Math.max(50, cleanQuery.length * toleranceRatio);

            if (distance < maxAllowedDistance || isContained || (sharedCount >= 3.5 && distance < 200) || (overlapRatio > 0.9 && distance < 400)) {
                results.push({
                    ...otherVerse,
                    score: Math.max(overlapRatio, otherOverlapRatio)
                });
            }
        }

        const sorted = results.sort((a, b) => b.score - a.score).slice(0, 10);
        if (sorted.length === 0) return [];

        return [{
            id: `dynamic-${gid}`,
            score: sorted[0].score,
            verses: [
                verse,
                ...sorted
            ]
        }];
    };

    const getSimilarGroup = (gid, intensity = 5) => {
        const groups = context.similarIndex.get(gid) || [];
        if (groups.length > 0) return groups;
        return findDynamicSimilars(gid, intensity);
    };

    return {
        init: async () => {
            try {
                const [qData, mMorph, wMap, sMap, pMap, sData] = await Promise.all([
                    loadData('data/quran.json'),
                    loadData('data/morphology.json'),
                    loadData('data/word-map.json'),
                    loadData('data/semantic.json'),
                    loadData('data/phonetic.json'),
                    loadData('data/similarities.json')
                ]);

                context.quranData = new Map(qData.map(v => [v.gid, v]));
                context.morphologyMap = new Map(mMorph.map(m => [m.gid, m]));
                context.wordMap = wMap;
                context.semanticMap = sMap;
                context.phoneticMap = pMap;
                const enrichedSData = sData.map(group => ({
                    ...group,
                    verses: group.verses.map(v => context.quranData.get(v.gid) || v)
                }));
                context.similarities = enrichedSData;

                const sIndex = new Map();
                enrichedSData.forEach(group => {
                    if (group.verses) {
                        group.verses.forEach(v => {
                            if (!sIndex.has(v.gid)) sIndex.set(v.gid, []);
                            sIndex.get(v.gid).push(group);
                        });
                    }
                });
                context.similarIndex = sIndex;
                context.invertedIndex = buildInvertedIndex(mMorph, qData);
                return context;
            } catch (err) {
                console.error("Initialization failed:", err);
                throw err;
            }
        },

        search: (query, options = {}) => {
            const quranMap = context.quranData;
            if (!quranMap) return [];
            
            const cleanQuery = normalizeArabic(query);
            const tokens = cleanQuery.split(/\s+/).filter(t => t && !isStopWord(t));
            const allTokensCount = cleanQuery.split(/\s+/).filter(Boolean).length;
            
            if (tokens.length === 0 && allTokensCount > 0) {
                // If all words were stop words, allow them but with low weight
                tokens.push(...cleanQuery.split(/\s+/).filter(Boolean));
            }

            if (allTokensCount === 0) {
                let all = Array.from(quranMap.values());
                if (options.suraId) all = all.filter(r => r.suraId === parseInt(options.suraId));
                if (options.juzId) all = all.filter(r => r.juzId === parseInt(options.juzId));
                return all.slice(0, 50);
            }
            
            const { wordIndex, lemmaIndex } = context.invertedIndex;
            const matches = new Map(); // gid -> { score, matchType }

            tokens.forEach(token => {
                // 1. Exact matches
                const exacts = wordIndex.get(token) || new Set();
                exacts.forEach(gid => {
                    const m = matches.get(gid) || { score: 0, matchType: 'exact' };
                    m.score += 3;
                    matches.set(gid, m);
                });

                // 2. Lemma matches
                const variants = stripCommonPrefixes(token);
                for (const v of variants) {
                    const entry = context.wordMap[v];
                    if (entry && entry.lemma) {
                        const lemmas = lemmaIndex.get(entry.lemma) || new Set();
                        lemmas.forEach(gid => {
                            const m = matches.get(gid) || { score: 0, matchType: 'lemma' };
                            if (m.matchType !== 'exact') m.matchType = 'lemma';
                            m.score += 2;
                            matches.set(gid, m);
                        });
                    }
                }
            });

            const results = Array.from(matches.entries())
                .map(([gid, data]) => {
                    const verse = quranMap.get(gid);
                    const groups = context.similarIndex.get(gid) || [];
                    const overlapRatio = data.score / (tokens.length * 5);
                    
                    let matchType = data.matchType;
                    
                    // Dynamic Similarity Detection Logic
                    // 1. Check if in pre-built groups
                    // 2. Check if overlap is high enough (>70%) for a meaningful phrase
                    const isHighOverlap = overlapRatio >= 0.7 && tokens.length >= 2;
                    const isMatchSegment = allTokensCount >= 3 && overlapRatio >= 0.6;

                    if (groups.length > 0 || isHighOverlap || isMatchSegment) {
                        if (matchType !== 'exact' || (groups.length > 0 && allTokensCount >= 3)) {
                             matchType = 'similarity';
                        }
                    }

                    return { 
                        ...verse, 
                        matchScore: data.score,
                        matchType: matchType,
                        hasSimilar: groups.length > 0 || isHighOverlap,
                        groups: groups,
                        overlap: overlapRatio
                    };
                });

            results.sort((a, b) => b.matchScore - a.matchScore || a.gid - b.gid);
            
            let filtered = results;
            if (options.suraId) filtered = filtered.filter(r => r.suraId === parseInt(options.suraId));
            if (options.juzId) filtered = filtered.filter(r => r.juzId === parseInt(options.juzId));

            return filtered.slice(0, 50);
        },

        getSimilarGroup,
        findDynamicSimilars,
        getVerse: (gid) => {
            if (!context.quranData) return null;
            return context.quranData.get(gid);
        }
    };
})();
