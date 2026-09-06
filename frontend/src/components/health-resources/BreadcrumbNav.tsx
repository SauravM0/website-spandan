import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export default function BreadcrumbNav({ title }: { title: string }) {
  return (
    <nav aria-label="Breadcrumb" className="container pt-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-text-light">
        <li>
          <Link href="/" className="inline-flex items-center gap-1 transition-colors hover:text-ink">
            <Home className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="h-4 w-4" />
        </li>
        <li>
          <Link href="/health" className="transition-colors hover:text-ink">
            Health Resources
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="h-4 w-4" />
        </li>
        <li aria-current="page" className="max-w-[240px] truncate font-medium text-ink sm:max-w-none">
          {title}
        </li>
      </ol>
    </nav>
  );
}
