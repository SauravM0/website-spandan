import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="section text-center py-24">
      <div className="container">
        <h1 className="text-7xl font-extrabold text-accent mb-2">404</h1>
        <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
        <p className="text-text-light mb-8 text-lg">The page you are looking for does not exist or has been moved.</p>
        <Link href="/" className="btn bg-navy text-white hover:bg-navy-light">Go Home</Link>
      </div>
    </section>
  );
}
