import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'new' | 'featured';
  children: React.ReactNode;
}

export default function Badge({ variant = 'default', children }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    new: 'badge-new',
    featured: 'badge-featured',
  };
  return (
    <span className={`badge ${variants[variant]}`}>{children}</span>
  );
}
