import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, BookOpen, Layers, X, Info, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { initializeEngine, search } from './lib/SearchEngine';
import { VerseDiff } from './components/VerseDiff';
import './styles/theme.css';

const App = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [range, setRange] = useState({ sura: '', juz: '' });
  const [comparisonBase, setComparisonBase] = useState<number | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeEngine();
        setLoading(false);
      } catch (err) {
        console.error('Failed to init engine:', err);
      }
    };
    init();
  }, []);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.trim().length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const searchOptions: any = {
        lemma: true,
        root: true,
        fuzzy: true,
      };
      
      if (range.sura) searchOptions.suraId = parseInt(range.sura);
      if (range.juz) searchOptions.juzId = parseInt(range.juz);

      const resp = await search(val, searchOptions);
      setResults(resp.results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const baseVerseText = useMemo(() => {
    if (comparisonBase === null) return undefined;
    const base = results.find(r => r.gid === comparisonBase);
    return base ? base.standard : undefined;
  }, [comparisonBase, results]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="mb-4"
        >
          <Loader2 size={48} className="text-emerald-600" />
        </motion.div>
        <h2 className="text-2xl font-bold text-emerald-800 dark:text-emerald-400 font-cairo">جاري تهيئة المصحف...</h2>
        <p className="text-slate-500 mt-2">بناء الفهرس اللحظي للبحث السريع</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 overflow-x-hidden">
      {/* Premium Header */}
      <header className="relative z-40 px-4 py-10 text-center">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none mb-2">
            <Sparkles className="text-white" size={28} />
          </div>
          <h1 className="text-3xl font-black text-emerald-900 dark:text-emerald-400 font-cairo tracking-tight">فُروق</h1>
          <p className="text-emerald-600/80 dark:text-emerald-500/80 text-sm font-medium">دليلك البصري لمتشابهات القرآن الكريم</p>
        </motion.div>
      </header>

      {/* Main Search Section */}
      <main className="max-w-3xl mx-auto px-4 mt-2">
        <div className="relative group">
          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none w-6 justify-center">
            {searching ? (
              <Loader2 className="animate-spin text-emerald-500" size={20} />
            ) : (
              <Search className="text-emerald-500" size={20} />
            )}
          </div>
          <input
            type="text"
            placeholder="ابحث عن آية أو كلمة (مثال: ذلك الكتاب)..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full h-16 pr-12 pl-14 bg-white dark:bg-slate-800 rounded-2xl border-none shadow-xl shadow-emerald-900/5 focus:ring-2 focus:ring-emerald-500 text-xl font-cairo outline-none"
          />
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="absolute inset-y-0 left-4 flex items-center text-slate-400 hover:text-emerald-600 transition-colors"
          >
            <Filter size={20} className={isFilterOpen ? 'text-emerald-600' : ''} />
          </button>
        </div>

        {/* Filter Drawer */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 bg-emerald-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-emerald-100/20 overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-emerald-800 mb-2">السورة</label>
                  <input 
                    type="number" 
                    placeholder="رقم السورة (1-114)" 
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border-none shadow-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                    value={range.sura}
                    onChange={(e) => setRange({...range, sura: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-emerald-800 mb-2">الجزء</label>
                  <input 
                    type="number" 
                    placeholder="رقم الجزء (1-30)" 
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border-none shadow-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                    value={range.juz}
                    onChange={(e) => setRange({...range, juz: e.target.value})}
                  />
                </div>
              </div>
              <button 
                onClick={() => { setRange({sura: '', juz: ''}); handleSearch(query); }}
                className="mt-4 text-xs text-red-500 font-bold flex items-center gap-1 hover:underline"
              >
                <X size={14} /> مسح التصفية
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Info Area - Fixed Height to prevent jump */}
        <div className="min-h-[40px] mt-6 flex items-center justify-between">
          <AnimatePresence>
            {results.length > 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between w-full"
              >
                <span className="text-sm font-bold text-slate-500">تم العثور على {results.length} نتيجة</span>
                {results.length > 1 && (
                  <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-200/50">
                    <AlertCircle size={14} className="text-amber-600" />
                    <span className="text-xs text-amber-800 dark:text-amber-400 font-bold">انقر على آية للمقارنة</span>
                  </div>
                )}
              </motion.div>
            ) : query.length > 1 && !searching && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full text-center py-10 opacity-50"
              >
                <BookOpen size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-xl">لا توجد نتائج تطابق بحثك</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results List */}
        <div className="mt-2 space-y-6">

          <AnimatePresence mode="popLayout">
            {results.map((verse, idx) => (
              <motion.article
                key={verse.gid}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setComparisonBase(comparisonBase === verse.gid ? null : verse.gid)}
                className={`relative p-6 rounded-3xl bg-white dark:bg-slate-800 shadow-xl shadow-emerald-900/5 border-2 transition-all cursor-pointer group ${
                  comparisonBase === verse.gid ? 'border-emerald-500 ring-4 ring-emerald-500/10' : 'border-transparent hover:border-emerald-200'
                }`}
              >
                {/* Meta info */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-black">
                      {verse.gid}
                    </span>
                    <div className="text-left rtl:text-right">
                      <h3 className="font-bold text-emerald-900 dark:text-emerald-300 leading-none mb-1">
                        {verse.suraName}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium">الآية رقم {verse.verseId}</p>
                    </div>
                  </div>
                </div>
                </div>

                {/* Verse Text Area */}
                <VerseDiff 
                  text={verse.standard} 
                  comparisonText={comparisonBase && comparisonBase !== verse.gid ? baseVerseText : undefined}
                  highlightedTerms={[query]}
                />

                {comparisonBase === verse.gid && (
                   <div className="absolute -top-3 left-6 px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full shadow-lg">
                      آية المرجع للمقارنة
                   </div>
                )}
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Action / Help */}
      {!loading && query.length === 0 && (
         <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-xs text-center">
            <div className="bg-emerald-900 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-center gap-2 animate-bounce">
               <Info size={18} />
               <p className="text-sm font-bold font-cairo">ابدأ بكتابة جملة للبحث</p>
            </div>
         </div>
      )}
    </div>
  );
};

export default App;
