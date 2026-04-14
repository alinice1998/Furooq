import React from 'react';

interface VerseDiffProps {
  text: string;           // The text of this verse
  comparisonText?: string; // Optional: another verse to compare against
  highlightedTerms?: string[]; // Terms from the search query to highlight
}

export const VerseDiff: React.FC<VerseDiffProps> = ({ text, comparisonText, highlightedTerms = [] }) => {
  // Simple word-by-word comparison for Mutashabihat
  const words = text.split(/\s+/);
  const compWords = comparisonText ? comparisonText.split(/\s+/) : [];

    return (
    <div className="quran-text leading-loose" dir="rtl">
      {words.map((word, idx) => {
        const isHighlighted = highlightedTerms.some(term => word.includes(term));
        
        // Match logic: highlight shared words in green, others neutral
        let colorClass = '';
        if (comparisonText) {
          const isShared = compWords.includes(word);
          colorClass = isShared ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-800 dark:text-slate-200';
        } else if (isHighlighted) {
          colorClass = 'text-emerald-600 dark:text-emerald-400 font-medium';
        }

        return (
          <span 
            key={idx}
            className={`inline-block px-0.5 rounded transition-colors ${colorClass}`}
          >
            {word}{' '}
          </span>
        );
      })}
    </div>
  );
};
