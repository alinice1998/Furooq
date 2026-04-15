const { useState, useEffect, useMemo, useRef } = React;

// UI Components - Robust Icon with cleanup
const Icon = ({ name, size = 20, className = "" }) => {
    const parentRef = useRef(null);
    useEffect(() => {
        let isMounted = true;
        if (window.lucide && parentRef.current) {
            try {
                parentRef.current.innerHTML = `<i data-lucide="${name}" class="${className}" style="width: ${size}px; height: ${size}px; display: inline-block;"></i>`;
                window.lucide.createIcons({
                    root: parentRef.current
                });
            } catch (e) {
                console.warn("Lucide error:", e);
            }
        }
        return () => { isMounted = false; };
    }, [name, size, className]);

    return <span ref={parentRef} className={`inline-flex items-center justify-center ${className}`}></span>;
};

// Match Type Badge Component
const MatchTypeBadge = ({ type }) => {
    const configs = {
        exact: { label: 'آية مشابهة', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'check-circle' },
        lemma: { label: 'اشتقاق لغوي', bg: 'bg-blue-100', text: 'text-blue-700', icon: 'git-branch' },
        root: { label: 'جذر مشترك', bg: 'bg-amber-100', text: 'text-amber-700', icon: 'hash' },
        similarity: { label: 'متشابهات', bg: 'bg-purple-100', text: 'text-purple-700', icon: 'copy' },
        search_match: { label: 'نتيجة بحث', bg: 'bg-slate-100', text: 'text-slate-600', icon: 'search' }
    };

    const config = configs[type] || configs.exact;

    return (
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black font-cairo ${config.bg} ${config.text} border border-current/10 shadow-sm`}>
            <Icon name={config.icon} size={10} />
            {config.label}
        </span>
    );
};

// Unified Hint Component for subtle notifications
const Hint = ({ type = 'info', title, children, icon, className = "" }) => {
    const themes = {
        info: {
            bg: 'bg-emerald-50/30 dark:bg-emerald-900/10',
            border: 'border-emerald-100/50 dark:border-emerald-800/20',
            text: 'text-emerald-900 dark:text-emerald-300',
            subText: 'text-emerald-700/70 dark:text-emerald-500',
            iconBg: 'bg-emerald-100 dark:bg-emerald-800',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            defaultIcon: 'lightbulb'
        },
        warning: {
            bg: 'bg-amber-50/30 dark:bg-amber-900/10',
            border: 'border-amber-100/50 dark:border-amber-800/20',
            text: 'text-amber-900 dark:text-amber-300',
            subText: 'text-amber-700/70 dark:text-amber-600',
            iconBg: 'bg-amber-100 dark:bg-amber-800',
            iconColor: 'text-amber-600 dark:text-amber-400',
            defaultIcon: 'alert-circle'
        },
        slate: {
            bg: 'bg-slate-50/50 dark:bg-slate-800/20',
            border: 'border-slate-200/50 dark:border-slate-700/30',
            text: 'text-slate-800 dark:text-slate-200',
            subText: 'text-slate-500 dark:text-slate-400',
            iconBg: 'bg-slate-100 dark:bg-slate-700',
            iconColor: 'text-slate-500 dark:text-slate-400',
            defaultIcon: 'info'
        }
    };

    const theme = themes[type] || themes.info;

    return (
        <div className={`flex items-start gap-4 p-5 ${theme.bg} ${theme.border} border rounded-3xl backdrop-blur-sm transition-all duration-300 ${className}`}>
            <div className={`p-2.5 ${theme.iconBg} rounded-xl ${theme.iconColor} flex-shrink-0 shadow-sm`}>
                <Icon name={icon || theme.defaultIcon} size={18} />
            </div>
            <div className="flex flex-col gap-1">
                {title && <h5 className={`text-sm font-black font-cairo ${theme.text}`}>{title}</h5>}
                <div className={`text-xs font-medium font-cairo leading-relaxed ${theme.subText}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

// Advanced Word-Level Differencing using LCS
const VerseDiff = ({ text, comparisonText, highlightedTerms = [], large = false }) => {
    const words = useMemo(() => (text || "").split(/\s+/).filter(Boolean), [text]);
    const compWords = useMemo(() => (comparisonText || "").split(/\s+/).filter(Boolean), [comparisonText]);

    // Simple normalization for highlighting matches in Uthmanic text
    const normalize = (val) => {
        if (!val) return "";
        return val
            .replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06FC]/g, "") // Remove Tashkeel
            .replace(/[إأآٱ]/g, "ا")
            .replace(/[ؤئء]/g, "ء")
            .replace(/ة/g, "ه")
            .replace(/ى/g, "ي");
    };

    const getCommonWords = (w1, w2) => {
        if (!w1.length || !w2.length) return new Set();
        const dp = Array(w1.length + 1).fill(0).map(() => Array(w2.length + 1).fill(0));
        for (let i = 1; i <= w1.length; i++) {
            for (let j = 1; j <= w2.length; j++) {
                if (w1[i - 1] === w2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
                else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
        const common = new Set();
        let i = w1.length, j = w2.length;
        while (i > 0 && j > 0) {
            if (w1[i - 1] === w2[j - 1]) {
                common.add(`${i - 1}-${w1[i - 1]}`);
                i--; j--;
            } else if (dp[i - 1][j] > dp[i][j - 1]) i--;
            else j--;
        }
        return common;
    };

    const commonSet = useMemo(() => comparisonText ? getCommonWords(words, compWords) : null, [words, compWords, comparisonText]);

    return (
        <div className={`font-amiri leading-[2.2] text-right ${large ? 'text-4xl' : 'text-2xl'}`} dir="rtl">
            {words.map((word, idx) => {
                const normalizedWord = normalize(word);
                const isHighlighted = highlightedTerms.some(term => {
                    if (!term) return false;
                    const normalizedTerm = normalize(term);
                    return normalizedWord.includes(normalizedTerm);
                });
                
                const isCommon = commonSet ? commonSet.has(`${idx}-${word}`) : true;

                // Styling logic based on comparison state
                let colorClass = 'text-slate-800 dark:text-slate-200';
                if (comparisonText) {
                    // When comparing, highlight commonalities in green
                    colorClass = isCommon
                        ? 'text-emerald-600 dark:text-emerald-400 font-black'
                        : 'text-slate-800 dark:text-slate-200'; // Differences are now neutral
                } else if (isHighlighted) {
                    // When not comparing, highlight search terms
                    colorClass = 'text-emerald-600 dark:text-emerald-400 font-black';
                }

                return (
                    <span
                        key={idx}
                        className={`inline-block px-1 rounded transition-all duration-300 ${colorClass}`}
                    >
                        {word}{' '}
                    </span>
                );
            })}
        </div>
    );
};

// Helper to calculate similarity score on the fly
const SimilarityScore = ({ v, refText }) => {
    const score = useMemo(() => {
        if (v.score) return v.score;
        if (v.overlap) return v.overlap;
        if (!refText) return 0;

        // Fallback calculation similar to Engine's overlap ratio
        const normalize = (val) => (val || "").replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06FC]/g, "").replace(/[إأآٱ]/g, "ا").replace(/[ؤئء]/g, "ء").replace(/ة/g, "ه").replace(/ى/g, "ي");
        const words = normalize(v.text || v.standard).split(/\s+/).filter(Boolean);
        const refWords = normalize(refText).split(/\s+/).filter(Boolean);
        const refSet = new Set(refWords);
        const matches = words.filter(w => refSet.has(w)).length;
        return matches / Math.max(words.length, refWords.length);
    }, [v, refText]);

    if (!score) return null;

    return (
        <div className="flex items-center bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-2xl border border-emerald-100 font-black text-xs font-cairo shadow-sm">
            {Math.round(score * 100)}%
        </div>
    );
};

// Sub-component for Similarity Card
const SimilarityCard = ({ v, refVerseText, isPotential = false, useUthmani = false }) => (
    <article
        className={`p-8 rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-xl border-2 transition-all ${isPotential ? 'border-slate-100 dark:border-slate-700/50' : 'border-transparent'
            }`}
    >
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-700 text-slate-500 font-bold text-[10px]">{v.gid}</div>
                <div className="flex flex-col">
                    <h4 className="text-lg font-black text-slate-800 dark:text-slate-200 font-cairo leading-none mb-2">
                        {v.sura_name || v.suraName} | {v.aya_id || v.verseId}
                    </h4>
                    <div className="flex gap-2">
                        {isPotential ? (
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black font-cairo bg-slate-100 text-slate-500 border border-slate-200">
                                <Icon name="search" size={10} />
                                تطابق بحث (محتمل)
                            </span>
                        ) : (
                            <MatchTypeBadge type={v.matchType || (v.text ? 'similarity' : 'exact')} />
                        )}
                    </div>
                </div>
            </div>
            {!isPotential && <SimilarityScore v={v} refText={refVerseText} />}
        </div>
        <VerseDiff text={(useUthmani && v.uthmani) ? v.uthmani : (v.text || v.standard)} comparisonText={refVerseText} />
    </article>
);

// Component for detail view
const ComparisonDetail = ({ gid, onBack, searchResults = [], query = "", useUthmani = false }) => {
    const [mainVerse, setMainVerse] = useState(null);
    const [similarGroups, setSimilarGroups] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [intensity, setIntensity] = React.useState(5);

    const refreshSimilarities = React.useCallback(async (val) => {
        try {
            const groups = Engine.getSimilarGroup(gid, val) || [];
            setSimilarGroups(groups);
        } catch (err) {
            console.error(err);
        }
    }, [gid]);

    React.useEffect(() => {
        const loadVerse = async () => {
            setLoading(true);
            try {
                const verse = Engine.getVerse(gid);
                if (verse) {
                    setMainVerse(verse);
                    await refreshSimilarities(intensity);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } catch (err) {
                console.error("Detail load error:", err);
            } finally {
                setLoading(false);
            }
        };
        loadVerse();
    }, [gid, refreshSimilarities]);

    const handleIntensityChange = (e) => {
        const val = parseInt(e.target.value);
        setIntensity(val);
        // Invert logic: 1 (Right) -> 10 (Strict), 10 (Left) -> 1 (Wide)
        refreshSimilarities(11 - val);
    };

    const refVerseText = useMemo(() => {
        if (!mainVerse) return "";
        if (useUthmani && mainVerse.uthmani) return mainVerse.uthmani;
        return mainVerse.standard || mainVerse.text;
    }, [mainVerse, useUthmani]);

    const extraMatches = useMemo(() => {
        if (!searchResults.length || !mainVerse) return [];
        const existingGids = new Set(similarGroups.flatMap(g => g.verses).map(v => v.gid));
        existingGids.add(mainVerse.gid);

        return searchResults
            .filter(r => !existingGids.has(r.gid) && r.matchType === 'exact')
            .map(r => ({
                ...r,
                matchType: 'search_match'
            }));
    }, [searchResults, similarGroups, mainVerse]);

    const verifiedSimilars = useMemo(() => {
        return similarGroups.flatMap(g => g.verses).filter(v => v.gid !== gid);
    }, [similarGroups, gid]);

    if (loading) return (
        <div className="py-20 text-center animate-pulse">
            <Icon name="loader-2" className="animate-spin text-emerald-600 mb-4" size={48} />
            <p className="font-cairo font-bold text-slate-400">تحميل بيانات الآية...</p>
        </div>
    );

    return (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 px-4">
            <button
                onClick={onBack}
                className="mb-8 flex items-center gap-2 text-slate-400 hover:text-emerald-600 transition-colors font-cairo font-bold group"
            >
                <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm group-hover:shadow-md transition-all">
                    <Icon name="arrow-right" size={18} />
                </div>
                العودة لنتائج البحث
            </button>

            <section className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 shadow-2xl shadow-emerald-900/5 mb-12 border border-emerald-50/50">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-emerald-600 text-white font-black shadow-lg shadow-emerald-200">
                            {mainVerse.verseId || mainVerse.aya_id}
                        </div>
                        <div>
                            <h2 className="text-3xl font-cairo font-black text-slate-800 tracking-tight leading-none mb-2">
                                سورة {mainVerse.suraName || mainVerse.sura_name}
                            </h2>
                            <span className="inline-block text-[10px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-100 bg-emerald-50 px-2 py-0.5 rounded-md">
                                الموضع المختار للمقارنة
                            </span>
                        </div>
                    </div>
                </div>
                <VerseDiff text={(useUthmani && mainVerse.uthmani) ? mainVerse.uthmani : (mainVerse.standard || mainVerse.text)} large={true} />
            </section>

            <div className="space-y-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-4">
                    <div className="flex items-center gap-3 text-emerald-900">
                        <div className="p-2 bg-emerald-100 rounded-xl">
                            <Icon name="layers" className="w-6 h-6 text-emerald-700" />
                        </div>
                        <h3 className="text-xl font-black font-cairo">المواضع المشابهة</h3>
                    </div>

                    <div className="flex flex-col gap-4 bg-white shadow-xl shadow-emerald-900/5 p-5 px-6 rounded-[2rem] border border-emerald-50 md:min-w-[320px]">
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-emerald-500 font-black uppercase tracking-wider">درجة المطابقة</span>
                                <span className="text-sm font-bold text-emerald-800">
                                    {intensity <= 3 ? 'مطابقة دقيقة' : intensity >= 8 ? 'تشابه عريض' : 'مطابقة متوازنة'}
                                </span>
                            </div>
                            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-100 text-sm font-black text-white">
                                {intensity}
                            </div>
                        </div>
                        
                        <div className="relative pt-2">
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={intensity}
                                onChange={handleIntensityChange}
                                className="w-full accent-emerald-600 h-2 bg-emerald-50 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between mt-2 text-[9px] font-black font-cairo text-slate-400 uppercase tracking-tighter">
                                <span>دقيق (نتائج أقل)</span>
                                <span>واسع (نتائج أكثر)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Verified Similarities Section */}
                {verifiedSimilars.length > 0 && (
                    <div className="space-y-6">
                        <Hint type="info" title="متشابهات محققة">
                            تم حصر هذه المواضع بدقة كمتشابهات لهذه الآية بشكل شبه مؤكد.
                        </Hint>
                        <div className="grid gap-6">
                            {verifiedSimilars.map(v => (
                                <SimilarityCard
                                    key={v.gid}
                                    v={v}
                                    refVerseText={refVerseText}
                                    useUthmani={useUthmani}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State for Verified Similarities */}
                {verifiedSimilars.length === 0 && (
                    <Hint type="warning" title="لا توجد متشابهات مباشرة محصورة" icon="alert-circle">
                        لم يتم العثور على روابط متشابهات محققة لهذه الآية في قاعدة البيانات. المواضع المعروضة أدناه (إن وجدت) هي نتائج من بحثك الحالي عن: <span className="underline font-bold">"{query}"</span>
                    </Hint>
                )}

                {/* Potential Search Matches Section */}
                {extraMatches.length > 0 && (
                    <div className="space-y-6">
                        <Hint type="slate" title="نتائج بحث محتملة التشابه" icon="search">
                            هذه المواضع ظهرت في بحثك عن "{query}" وقد تكون مشابهة، لكن لم يتم تصنيفها كمتشابهات مؤكدة.
                        </Hint>
                        <div className="grid gap-6">
                            {extraMatches.map(v => (
                                <SimilarityCard
                                    key={v.gid}
                                    v={v}
                                    refVerseText={refVerseText}
                                    isPotential={true}
                                    useUthmani={useUthmani}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const App = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [view, setView] = useState('search');
    const [selectedGid, setSelectedGid] = useState(null);
    const [error, setError] = useState(null);
    const [useUthmani, setUseUthmani] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                if (typeof Engine === 'undefined') throw new Error('Engine loading failed');
                await Engine.init();
                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };
        init();
    }, []);

    const handleSearch = (val) => {
        setQuery(val);
    };

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setSearching(false);
            return;
        }

        setSearching(true);
        const timer = setTimeout(() => {
            try {
                const res = Engine.search(query);
                setResults(res);
            } catch (e) {
                console.error("Search error:", e);
            } finally {
                setSearching(false);
            }
        }, 400); // 400ms debounce delay

        return () => clearTimeout(timer);
    }, [query]);

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
            <div className="animate-spin mb-4 text-emerald-600"><Icon name="loader-2" size={48} /></div>
            <h2 className="text-2xl font-black text-emerald-900 dark:text-emerald-400 font-cairo">جاري التحميل...</h2>
        </div>
    );

    return (
        <div className="min-h-screen pb-20 bg-slate-50 dark:bg-slate-900 transition-colors duration-500">
            <header className="relative z-40 bg-white dark:bg-slate-900 px-4 py-10 text-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-emerald-600 rounded-2xl shadow-xl shadow-emerald-200"><Icon name="sparkles" size={24} className="text-white" /></div>
                    <h1 className="text-3xl font-black text-emerald-900 dark:text-emerald-400 font-cairo tracking-tight">فُروق</h1>
                    <p className="text-emerald-600/80 text-xs font-bold font-cairo uppercase tracking-widest">البحث البصري في المتشابهات</p>
                </div>

                {deferredPrompt && (
                    <button 
                        onClick={handleInstallClick} 
                        className="mt-6 flex items-center justify-center gap-2 mx-auto bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-full transition-all duration-300 font-cairo font-bold shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40 active:scale-95"
                    >
                        <Icon name="download-cloud" size={18} />
                        تثبيت التطبيق على الجهاز
                    </button>
                )}

                {/* Uthmani Toggle Switch */}
                <div className="mt-8 inline-flex items-center gap-3 bg-white dark:bg-slate-800 p-2 px-4 rounded-2xl shadow-sm border border-emerald-50 dark:border-slate-700">
                    <span className={`text-xs font-bold font-cairo transition-colors ${!useUthmani ? 'text-emerald-600' : 'text-slate-400'}`}>نص مبسط</span>
                    <button
                        onClick={() => setUseUthmani(!useUthmani)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${useUthmani ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${useUthmani ? '-translate-x-6' : '-translate-x-1'}`}
                        />
                    </button>
                    <span className={`text-xs font-bold font-cairo transition-colors ${useUthmani ? 'text-emerald-600' : 'text-slate-400'}`}>رسم عثماني</span>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 mt-10">
                {view === 'search' ? (
                    <div className="animate-in fade-in duration-500">
                        {/* Search Tip Banner */}
                        <Hint type="info" title="نصيحة للبحث الدقيق" className="mb-6">
                            لتحقيق أفضل تطابق، أدخل <span className="underline decoration-emerald-400 font-bold">النص المراد البحث عنه بدقة</span>.
                        </Hint>

                        <div className="relative mb-8">
                            <div className="absolute inset-y-0 right-4 flex items-center w-6 justify-center">
                                {searching ? <Icon name="loader-2" className="animate-spin text-emerald-500" /> : <Icon name="search" className="text-emerald-500" />}
                            </div>
                            <input
                                type="text"
                                placeholder="ابحث بصيغة الآية..."
                                value={query}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="w-full h-16 pr-14 pl-6 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border-2 border-transparent focus:border-emerald-500 outline-none text-xl font-cairo"
                            />
                        </div>

                        <div className="space-y-6">
                            {results.map((verse) => (
                                <article
                                    key={verse.gid}
                                    className="p-8 rounded-[2.5rem] bg-white dark:bg-slate-800 shadow-lg border-2 border-transparent hover:border-emerald-500 cursor-pointer transition-all group active:scale-95"
                                    onClick={() => { setSelectedGid(verse.gid); setView('detail'); }}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 font-black text-[10px] group-hover:bg-emerald-600 group-hover:text-white transition-colors tracking-tighter">{verse.gid}</div>
                                                <h3 className="text-lg font-black text-emerald-900 dark:text-emerald-300 font-cairo">سورة {verse.suraName || verse.sura_name} | {verse.verseId || verse.aya_id}</h3>
                                            </div>
                                        </div>
                                    </div>
                                    <VerseDiff text={useUthmani ? verse.uthmani : (verse.text || verse.standard)} highlightedTerms={[query]} />
                                    <div className="flex justify-end items-center mt-6">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 group-hover:translate-x-[-4px] transition-transform">
                                            <Icon name="layers" size={14} />
                                            <span>مواضع التشابه</span>
                                            <Icon name="chevron-left" size={14} />
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                ) : (
                    <ComparisonDetail gid={selectedGid} onBack={() => setView('search')} searchResults={results} query={query} useUthmani={useUthmani} />
                )}
            </main>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
