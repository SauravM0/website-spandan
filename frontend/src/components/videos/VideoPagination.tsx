import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function VideoPagination({
  currentPage,
  totalPages,
  total,
  basePath,
  topic,
  lang,
}: {
  currentPage: number;
  totalPages: number;
  total: number;
  basePath: string;
  topic: string;
  lang: string;
}) {
  if (totalPages <= 1) return null;

  function href(page: number): string {
    const params = new URLSearchParams();
    if (topic) params.set('topic', topic);
    if (lang) params.set('lang', lang);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-3">
      {currentPage > 1 ? (
        <Button
          href={href(currentPage - 1)}
          variant="outline"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
      ) : (
        <span className="btn btn-outline inline-flex min-h-[44px] min-w-[44px] cursor-not-allowed items-center justify-center gap-1.5 opacity-40">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Previous</span>
        </span>
      )}

      <span className="px-3 text-sm text-text-light">
        Page {currentPage} of {totalPages}
        <span className="hidden sm:inline"> ({total} videos)</span>
      </span>

      {currentPage < totalPages ? (
        <Button
          href={href(currentPage + 1)}
          variant="outline"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : (
        <span className="btn btn-outline inline-flex min-h-[44px] min-w-[44px] cursor-not-allowed items-center justify-center gap-1.5 opacity-40">
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
