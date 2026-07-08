import React from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';

export default function VideoFilters({
  topics,
  languages,
  currentTopic,
  currentLang,
  basePath,
}: {
  topics: string[];
  languages: string[];
  currentTopic: string;
  currentLang: string;
  basePath: string;
}) {
  function href(topic: string, lang: string): string {
    const params = new URLSearchParams();
    if (topic) params.set('topic', topic);
    if (lang) params.set('lang', lang);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const hasFilters = currentTopic || currentLang;

  return (
    <form className="soft-card mb-8 p-4 md:p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Topic</span>
          <select
            name="topic"
            defaultValue={currentTopic}
            className="min-h-[44px] w-full rounded-2xl border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="">All topics</option>
            {topics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Language</span>
          <select
            name="lang"
            defaultValue={currentLang}
            className="min-h-[44px] w-full rounded-2xl border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="">All languages</option>
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang === 'en' ? 'English' : lang === 'hi' ? 'Hindi' : lang === 'mr' ? 'Marathi' : lang}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-3">
          <button type="submit" className="btn btn-primary flex-1 md:flex-none">
            <Search className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Apply
          </button>
          {hasFilters && (
            <Link
              href={basePath}
              className="btn btn-outline flex items-center gap-1.5 md:flex-none"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Clear
            </Link>
          )}
        </div>
      </div>
    </form>
  );
}
