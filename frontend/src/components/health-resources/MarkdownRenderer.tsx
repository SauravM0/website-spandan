import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import type { Components } from 'react-markdown';

const ALLOWED_PROTOCOLS = ['https:', 'http:', 'mailto:'];

function ExternalLink({ href, children }: { href?: string; children: React.ReactNode }) {
  if (!href) return <span>{children}</span>;
  try {
    const url = new URL(href);
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) return <span>{children}</span>;
    const isExternal = url.hostname !== 'spandanclinic.com' && !url.hostname.includes('spandanclinic.');
    if (isExternal) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:decoration-accent">
          {children}
          <span className="sr-only"> (opens in new tab)</span>
        </a>
      );
    }
    return (
      <a href={href} className="text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:decoration-accent">
        {children}
      </a>
    );
  } catch {
    return <span>{children}</span>;
  }
}

const components: Components = {
  a: ({ href, children }) => (
    <ExternalLink href={href}>{children}</ExternalLink>
  ),
  table: ({ children }) => (
    <div className="mb-6 overflow-x-auto" tabIndex={0} role="region" aria-label="Table">
      <table className="min-w-full border-collapse border border-border text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border bg-bg-alt px-4 py-2 text-left font-semibold text-ink">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-4 py-2 text-text-light">{children}</td>
  ),
  img: ({ src, alt }) => (
    <img src={src} alt={alt || ''} className="my-6 h-auto max-w-full rounded-lg" loading="lazy" />
  ),
};

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="article-body prose prose-navy max-w-none text-base leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize, rehypeSlug]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
