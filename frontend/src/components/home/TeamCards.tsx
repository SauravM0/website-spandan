'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Pill, ClipboardList, HeartHandshake } from 'lucide-react';

const teamRoles = [
  {
    role: 'Pharmacist',
    description: 'Medication guidance and patient support',
    icon: <Pill size={28} />,
  },
  {
    role: 'Administrator',
    description: 'Appointments, reports, and enquiry coordination',
    icon: <ClipboardList size={28} />,
  },
  {
    role: 'Our Care Team',
    description: 'Support staff helping patients through each visit',
    icon: <HeartHandshake size={28} />,
    grouped: true,
  },
];

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

export default function TeamCardsSection() {
  return (
    <section className="section bg-bg-alt">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="heading-section text-navy mb-2">Our Team</h2>
          <p className="text-lg text-text-light">
            Dedicated professionals supporting your health journey
          </p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid-3"
        >
          {teamRoles.map((member) => (
            <motion.div key={member.role} variants={item}>
              <div className="card p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center text-primary">
                  {member.icon}
                </div>
                <h3 className="text-lg font-bold text-navy mb-1">{member.role}</h3>
                <p className="text-xs text-text-light mt-2">{member.description}</p>
                <div className="mt-4 w-8 h-1 bg-accent/30 mx-auto rounded-full" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
