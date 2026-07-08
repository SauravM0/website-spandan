import React from 'react';
import Link from 'next/link';
import { ArrowRight, Calculator, FileText, Video } from 'lucide-react';
import type { PublicArticleSummary } from '@/lib/home';

type HomeResourcesProps = {
  article: PublicArticleSummary | null;
  video: PublicArticleSummary | null;
};

export default function HomeResources({ article, video }: HomeResourcesProps) {
  const items = [
    {
      label: 'Article',
      title: article?.title || 'Health resources',
      text: article?.excerpt || 'Read clinic-published resources and updates.',
      href: article ? `/health-resources/${article.slug}` : '/health-resources',
      icon: FileText,
    },
    {
      label: 'Video',
      title: video?.title || 'Health videos',
      text: video?.excerpt || 'Watch public clinic education videos.',
      href: '/videos',
      icon: Video,
    },
    {
      label: 'Tool',
      title: 'Medical calculators',
      text: 'Use public health tools with medical disclaimers.',
      href: '/tools',
      icon: Calculator,
    },
  ];

  return (
    <section className="section">
      <div className="container">
        <div className="mb-10 max-w-3xl">
          <h2 className="heading-section mb-2 text-navy">Learn before you book</h2>
          <p className="text-text-light">
            Public education links stay separate from patient booking and do not collect medical history.
          </p>
        </div>

        <div className="grid-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.href} className="card trust-card flex h-full flex-col p-6">
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-accent">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <p className="text-sm font-bold text-accent">{item.label}</p>
                <h3 className="mt-2 text-lg font-bold text-navy">{item.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-text-light">{item.text}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                  Open
                  <ArrowRight size={16} aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
