import React from 'react';
import { Search, X } from 'lucide-react';
import Button from '@/components/ui/Button';

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
            name="vlang"
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
          <Button type="submit" variant="primary" className="flex-1 md:flex-none">
            <Search className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Apply
          </Button>
          {hasFilters && (
            <Button
              href={basePath}
              variant="outline"
              className="flex items-center gap-1.5 md:flex-none"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
