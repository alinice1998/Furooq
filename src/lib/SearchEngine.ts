import { 
  loadQuranData, 
  loadMorphology, 
  loadWordMap, 
  loadSemanticData, 
  loadPhoneticData,
  buildInvertedIndex,
  search as engineSearch
} from './engine';
import type { SearchContext, VerseInput, AdvancedSearchOptions, SearchResponse } from './engine/types';

let searchContext: SearchContext<VerseInput> | null = null;
let invertedIndex: any = null;

export const initializeEngine = async () => {
  if (searchContext) return searchContext;

  console.log('Initializing Quran Search Engine...');
  const [quranData, morphologyMap, wordMap, semanticMap, phoneticMap] = await Promise.all([
    loadQuranData(),
    loadMorphology(),
    loadWordMap(),
    loadSemanticData(),
    loadPhoneticData()
  ]);

  console.log('Building Inverted Index...');
  invertedIndex = buildInvertedIndex(morphologyMap, quranData, semanticMap);

  searchContext = {
    quranData,
    morphologyMap,
    wordMap,
    invertedIndex,
    semanticMap,
    phoneticMap
  };

  console.log('Engine initialized successfully.');
  return searchContext;
};

export const search = async (query: string, options: AdvancedSearchOptions = { lemma: true, root: true }) => {
  if (!searchContext) {
    await initializeEngine();
  }
  
  if (!searchContext) throw new Error('Failed to initialize search context');

  // We use the context and the engine's search function
  return engineSearch(query, searchContext, options);
};

export const getVerse = (gid: number) => {
  return searchContext?.quranData.get(gid);
};
