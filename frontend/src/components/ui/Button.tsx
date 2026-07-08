import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'outline';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export default function Button({ variant = 'primary', size = 'md', children, className = '', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-300 min-h-[44px] min-w-[44px] hover:-translate-y-0.5';
  const variants = {
    primary: 'bg-gradient-to-r from-accent to-primary text-white shadow-[0_10px_24px_rgba(43,138,198,0.14)] hover:shadow-[0_16px_34px_rgba(43,138,198,0.22)]',
    accent: 'bg-gradient-to-r from-accent to-primary-light text-white shadow-[0_10px_24px_rgba(43,138,198,0.14)] hover:shadow-[0_16px_34px_rgba(43,138,198,0.22)]',
    outline: 'bg-white text-navy shadow-[0_10px_24px_rgba(43,138,198,0.08)] hover:bg-blue-50 hover:text-accent hover:shadow-[0_14px_30px_rgba(43,138,198,0.14)]',
  };
  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-5 py-3 text-sm',
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}
