'use client';

import React, { useEffect, useState } from 'react';

/**
 * Filters the server-rendered facility groups by toggling their `hidden`
 * attribute. The markup stays in the HTML for crawlers and for anyone without
 * JavaScript — this only narrows what is on screen.
 */
export default function FacilityFilter({ categories }: { categories: string[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const groups = document.querySelectorAll<HTMLElement>('[data-facility-category]');
    groups.forEach((group) => {
      group.hidden = active !== null && group.dataset.facilityCategory !== active;
    });
    return () => {
      groups.forEach((group) => {
        group.hidden = false;
      });
    };
  }, [active]);

  return (
    <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filter facilities by category">
      <button
        type="button"
        onClick={() => setActive(null)}
        aria-pressed={active === null}
        className={`btn btn-sm ${active === null ? 'btn-accent' : 'btn-outline'}`}
      >
        All facilities
      </button>
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => setActive(category)}
          aria-pressed={active === category}
          className={`btn btn-sm ${active === category ? 'btn-accent' : 'btn-outline'}`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
