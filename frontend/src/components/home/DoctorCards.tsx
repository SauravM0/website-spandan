'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getDoctors } from '../../lib/api';
import CardioBackground from '../animations/CardioBackground';
import EndoBackground from '../animations/EndoBackground';
import { SpecialityBadge } from '../icons/SpecialityBadge';

interface Doctor {
  slug: string;
  name: string;
  speciality: string;
  qualifications: string;
  bio?: string;
  image_url?: string;
}

function getCredibilityLine(doc: Doctor): string | null {
  if (!doc.bio) return null;
  for (const line of doc.bio.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('Registration:')) return trimmed.replace('Registration:', '').trim();
    if (trimmed.startsWith('Notable Achievement:')) {
      const achievement = trimmed.replace('Notable Achievement:', '').trim();
      const idx = achievement.indexOf('[NEEDS CONFIRMATION');
      return idx > 0 ? achievement.substring(0, idx).trim() : achievement;
    }
    if (trimmed.startsWith('Media / Recognition:')) {
      const media = trimmed.replace('Media / Recognition:', '').trim();
      const idx = media.indexOf('[NEEDS CONFIRMATION');
      return idx > 0 ? media.substring(0, idx).trim() : media;
    }
  }
  return null;
}

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

function DoctorCard({ doc }: { doc: Doctor }) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const credibility = getCredibilityLine(doc);

  const handleMouseMove = (e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 4, y: y * -4 });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  const isCardiology = doc.slug === 'dr-aute' || doc.slug?.includes('aute') && !doc.slug?.includes('pawal');
  const isEndocrinology = doc.slug === 'dr-pawal-aute' || doc.slug?.includes('pawal');

  return (
    <motion.div variants={item}>
      <Link
        ref={cardRef}
        href={`/doctors/${doc.slug}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `perspective(600px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
        }}
        className="card p-6 block group transition-transform duration-200 relative overflow-hidden"
      >
        {isCardiology && <CardioBackground />}
        {isEndocrinology && <EndoBackground />}
        <div className="w-[80px] h-[80px] rounded-full bg-primary mb-4 flex items-center justify-center text-white text-2xl font-bold group-hover:scale-105 transition-transform relative z-10">
          {doc.image_url ? (
            <img src={doc.image_url} alt={doc.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            doc.name.split(' ').map((w: string) => w[0]).join('')
          )}
        </div>
        <h3 className="text-lg font-bold text-navy mb-1 relative z-10">{doc.name}</h3>
        <p className="text-sm font-semibold text-accent mb-2 relative z-10">{doc.speciality}</p>
        <p className="text-xs text-text-light relative z-10">{doc.qualifications}</p>
        {(isCardiology || isEndocrinology) && (
          <div className="relative z-10 mt-1.5">
            <SpecialityBadge type={isCardiology ? 'cardiology' : 'endocrinology'} />
          </div>
        )}
        {credibility && !isCardiology && !isEndocrinology && (
          <p className="text-xs text-primary mt-1.5 font-medium relative z-10">{credibility}</p>
        )}
        {credibility && (isCardiology || isEndocrinology) && (
          <p className="text-xs text-primary mt-1 font-medium relative z-10">{credibility}</p>
        )}
        <div className="mt-3 pt-3 border-t border-border relative z-10">
          <span className="text-xs font-semibold text-primary">View Profile &rarr;</span>
        </div>
      </Link>
    </motion.div>
  );
}

export default function DoctorCardsSection() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDoctors()
      .then((d) => setDoctors(d.doctors))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-text-light text-center">Loading...</p>;
  }

  if (doctors.length === 0) {
    return <p className="text-text-light text-center">No doctors available.</p>;
  }

  return (
    <section className="section">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="heading-section text-navy mb-2">Our Expert Doctors</h2>
          <p className="text-lg text-text-light">Meet our team of experienced specialists</p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid-3"
        >
          {doctors.map((doc) => (
            <DoctorCard key={doc.slug} doc={doc} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
