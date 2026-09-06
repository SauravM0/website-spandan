import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Button from '../Button';

describe('Button', () => {
  it('defaults to type="button" so it cannot submit a form by accident', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('keeps an explicit submit type', () => {
    render(<Button type="submit">Send</Button>);
    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('type', 'submit');
  });

  it('applies variant and size classes', () => {
    render(<Button variant="outline" size="sm" className="shrink-0">Filter</Button>);
    const button = screen.getByRole('button', { name: 'Filter' });
    expect(button.className).toContain('btn');
    expect(button.className).toContain('btn-outline');
    expect(button.className).toContain('btn-sm');
    expect(button.className).toContain('shrink-0');
  });

  it('blocks interaction and announces busy while loading', () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Saving</Button>);
    const button = screen.getByRole('button', { name: /Saving/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    button.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders an anchor for non-route hrefs', () => {
    render(<Button href="tel:+911234567890">Call</Button>);
    expect(screen.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:+911234567890');
  });

  it('renders an in-app link for route hrefs', () => {
    render(<Button href="/doctors" variant="accent">Doctors</Button>);
    const link = screen.getByRole('link', { name: 'Doctors' });
    expect(link).toHaveAttribute('href', '/doctors');
    expect(link.className).toContain('btn-accent');
  });
});
