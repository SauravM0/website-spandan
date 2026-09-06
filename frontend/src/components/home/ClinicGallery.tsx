import React from 'react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import PulseLine from '@/components/brand/PulseLine';

type GalleryItem = {
  src: string;
  alt: string;
  title: string;
  caption: string;
  span?: 'wide' | 'tall';
};

// Editorial grid: two anchor images carry the section, the rest form a quiet
// supporting row. Order matters more than count here.
const items: GalleryItem[] = [
  {
    src: '/Services/ecg-machine.png',
    alt: 'ECG machine used for cardiac assessment at Spandan Clinic',
    title: 'ECG',
    caption: 'Resting cardiac rhythm and conduction, reviewed the same visit.',
    span: 'wide',
  },
  {
    src: '/Services/cgms.png',
    alt: 'Continuous glucose monitoring sensor and reader',
    title: 'CGMS',
    caption: 'Continuous glucose monitoring for pattern-led diabetes care.',
    span: 'tall',
  },
  {
    src: '/Services/2d-echo.png',
    alt: '2D echocardiography equipment',
    title: '2D Echo',
    caption: 'Structural and functional imaging of the heart.',
  },
  {
    src: '/Services/tmt-machine.png',
    alt: 'Treadmill stress test equipment',
    title: 'TMT',
    caption: 'Exercise stress testing under supervision.',
  },
  {
    src: '/Services/holter-monitor.png',
    alt: 'Holter monitor for ambulatory cardiac recording',
    title: 'Holter',
    caption: 'Ambulatory rhythm recording across a full day.',
  },
  {
    src: '/Services/inbody.png',
    alt: 'InBody body composition analyser',
    title: 'InBody',
    caption: 'Body composition to guide metabolic treatment.',
  },
];

export default function ClinicGallery() {
  return (
    <section className="section section-paper" aria-labelledby="gallery-title">
      <div className="container">
        <div className="reveal mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="measure">
            <p className="eyebrow">Inside Spandan</p>
            <h2 id="gallery-title" className="heading-section mt-3 text-ink">
              Care supported by modern diagnostics
            </h2>
            <p className="lede mt-4">
              The equipment behind a consultation — what it measures, and why it changes the
              treatment you are given.
            </p>
          </div>
          <Button href="/facilities" variant="outline" className="self-start md:self-auto">
            Explore facilities
          </Button>
        </div>

        <div className="stagger grid auto-rows-[minmax(0,1fr)] gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <figure
              key={item.title}
              className={`group card flex flex-col ${
                item.span === 'wide' ? 'lg:col-span-2' : ''
              } ${item.span === 'tall' ? 'lg:row-span-2' : ''}`}
            >
              <div
                className={`relative overflow-hidden bg-wash-sage ${
                  item.span === 'tall' ? 'aspect-[4/5] lg:aspect-auto lg:flex-1' : 'aspect-[4/3]'
                }`}
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                />
              </div>
              <figcaption className="flex flex-col gap-1 p-5">
                <span className="heading-card text-ink">{item.title}</span>
                <span className="text-sm leading-relaxed text-text-light">{item.caption}</span>
              </figcaption>
            </figure>
          ))}
        </div>

        <PulseLine
          variant="metabolic"
          animate
          className="mt-14 h-10 w-full text-primary/30"
        />
      </div>
    </section>
  );
}
