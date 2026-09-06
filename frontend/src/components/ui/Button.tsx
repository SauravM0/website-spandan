import React from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  accent: 'btn-accent',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

type ButtonBaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, sets aria-busy, and blocks interaction. */
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  children?: React.ReactNode;
};

/**
 * Class string for the shared button styling, for the rare case where the
 * element cannot be a <Button> (e.g. a third-party component's own render prop).
 * Prefer <Button> — it also handles type, disabled and loading state.
 */
export function buttonClass({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
}: Pick<ButtonBaseProps, 'variant' | 'size' | 'fullWidth' | 'className'> = {}): string {
  return [
    'btn',
    VARIANT_CLASS[variant],
    size === 'sm' ? 'btn-sm' : '',
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

type ButtonAsButtonProps = ButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    href?: undefined;
  };

type ButtonAsLinkProps = ButtonBaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href'> & {
    href: string;
  };

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

export default function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    className,
    children,
    ...rest
  } = props;

  const classes = buttonClass({ variant, size, fullWidth, className });
  const spinner = loading ? (
    <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 18} aria-hidden="true" />
  ) : null;

  if (rest.href !== undefined) {
    const { href, ...anchorProps } = rest as ButtonAsLinkProps;
    // Client-side routing only makes sense for in-app paths; everything else
    // (external sites, tel:, mailto:, in-page anchors) stays a plain anchor.
    const isRoute = href.startsWith('/') && !href.startsWith('//');
    if (!isRoute) {
      return (
        <a href={href} className={classes} aria-busy={loading || undefined} {...anchorProps}>
          {spinner}
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} aria-busy={loading || undefined} {...anchorProps}>
        {spinner}
        {children}
      </Link>
    );
  }

  const { type, disabled, ...buttonProps } = rest as ButtonAsButtonProps;
  return (
    <button
      type={type ?? 'button'}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...buttonProps}
    >
      {spinner}
      {children}
    </button>
  );
}
