import React from 'react';

/**
 * lucide-react dropped its brand glyphs in v1, so the four channels the clinic
 * publishes on carry their own marks here.
 *
 * Each icon paints itself in the platform's own brand colour rather than
 * inheriting `currentColor`, which is what makes the footer row readable at a
 * glance instead of four identical grey outlines. Instagram needs a gradient,
 * so its definition carries a document-unique id.
 */
type IconProps = {
  size?: number;
  className?: string;
};

/** Brand colours, also used for the tinted chip each icon sits on. */
export const socialBrandColors = {
  facebook: '#1877F2',
  instagram: '#D62976',
  youtube: '#FF0000',
  linkedin: '#0A66C2',
} as const;

function wrap(children: React.ReactNode, { size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return wrap(
    <path
      fill={socialBrandColors.facebook}
      d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z"
    />,
    props
  );
}

export function InstagramIcon(props: IconProps) {
  // The gradient id has to be unique per document, not per instance: the footer
  // renders this icon once, and a stable id keeps server and client markup equal.
  const gradientId = 'spandan-instagram-gradient';
  return wrap(
    <>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FDCB52" />
          <stop offset="30%" stopColor="#F7733E" />
          <stop offset="60%" stopColor="#D62976" />
          <stop offset="100%" stopColor="#7638FA" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradientId})`}
        d="M12 2c2.72 0 3.06.01 4.12.06 1.07.05 1.79.22 2.43.47.66.25 1.22.6 1.78 1.15.55.56.9 1.12 1.15 1.78.25.64.42 1.36.47 2.43.05 1.06.06 1.4.06 4.11s-.01 3.05-.06 4.11c-.05 1.07-.22 1.79-.47 2.43-.25.66-.6 1.22-1.15 1.78-.56.55-1.12.9-1.78 1.15-.64.25-1.36.42-2.43.47-1.06.05-1.4.06-4.12.06s-3.06-.01-4.12-.06c-1.07-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.78-1.15 4.9 4.9 0 0 1-1.15-1.78c-.25-.64-.42-1.36-.47-2.43C2.01 15.05 2 14.71 2 12s.01-3.05.06-4.11c.05-1.07.22-1.79.47-2.43.25-.66.6-1.22 1.15-1.78A4.9 4.9 0 0 1 5.46 2.53c.64-.25 1.36-.42 2.43-.47C8.95 2.01 9.28 2 12 2Zm0 1.8c-2.67 0-2.99.01-4.04.06-.98.04-1.5.2-1.86.34-.46.18-.8.4-1.15.74-.35.35-.56.68-.74 1.15-.13.35-.3.88-.34 1.85-.05 1.06-.06 1.37-.06 4.04s.01 2.99.06 4.04c.04.98.2 1.5.34 1.86.18.46.4.8.74 1.15.35.34.69.56 1.15.74.35.13.88.3 1.86.34 1.05.05 1.37.06 4.04.06s2.99-.01 4.04-.06c.98-.04 1.5-.2 1.86-.34.46-.18.8-.4 1.15-.74.35-.35.56-.69.74-1.15.13-.35.3-.88.34-1.86.05-1.05.06-1.37.06-4.04s-.01-2.98-.06-4.04c-.04-.98-.2-1.5-.34-1.85a3.1 3.1 0 0 0-.74-1.15 3.1 3.1 0 0 0-1.15-.74c-.35-.13-.88-.3-1.86-.34-1.05-.05-1.37-.06-4.04-.06Zm0 3.06a5.14 5.14 0 1 1 0 10.28 5.14 5.14 0 0 1 0-10.28Zm0 1.8a3.34 3.34 0 1 0 0 6.68 3.34 3.34 0 0 0 0-6.68Zm5.34-3.2a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z"
      />
    </>,
    props
  );
}

export function YoutubeIcon(props: IconProps) {
  return wrap(
    <>
      <path
        fill={socialBrandColors.youtube}
        d="M21.58 7.19a2.5 2.5 0 0 0-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42a2.5 2.5 0 0 0-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81a2.5 2.5 0 0 0 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42a2.5 2.5 0 0 0 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81Z"
      />
      <path fill="#fff" d="M10 15.02V8.98L15.2 12 10 15.02Z" />
    </>,
    props
  );
}

export function LinkedinIcon(props: IconProps) {
  return wrap(
    <path
      fill={socialBrandColors.linkedin}
      d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96C2 21.32 2.69 22 3.55 22h16.9c.86 0 1.55-.68 1.55-1.52V3.52C22 2.68 21.31 2 20.45 2ZM8.14 18.9h-2.9V9.5h2.9v9.4Zm-1.45-10.7a1.69 1.69 0 1 1 0-3.38 1.69 1.69 0 0 1 0 3.38ZM18.9 18.9h-2.9v-4.57c0-1.09-.02-2.49-1.52-2.49-1.52 0-1.76 1.19-1.76 2.41v4.65h-2.9V9.5h2.79v1.28h.04c.39-.73 1.34-1.5 2.75-1.5 2.94 0 3.5 1.93 3.5 4.45v5.17Z"
    />
  , props);
}
