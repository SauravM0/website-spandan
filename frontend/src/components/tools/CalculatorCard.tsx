'use client';

import React from 'react';

export default function CalculatorCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <article className="card p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="icon-chip flex h-11 w-11 shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-bold text-navy">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-text-light">{description}</p>
        </div>
      </div>
      {children}
    </article>
  );
}
