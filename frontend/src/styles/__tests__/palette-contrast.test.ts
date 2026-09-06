import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Guards the WCAG contrast of the palette itself. The tokens are the single
 * source of truth for the whole site, so checking them here catches a bad
 * colour change before it reaches a component.
 */
const css = readFileSync(path.join(process.cwd(), 'src/styles/globals.css'), 'utf8');

function token(name: string): [number, number, number] {
  const line = css
    .split(String.fromCharCode(10))
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`--color-${name}:`));
  if (!line) throw new Error(`Token --color-${name} not found`);
  const numbers = line
    .slice(line.indexOf(':') + 1)
    .split(';')[0]
    .trim()
    .split(/[ ,]+/)
    .map(Number);
  if (numbers.length < 3 || numbers.some((value) => !Number.isFinite(value))) {
    throw new Error(`Token --color-${name} is not an R G B triplet: ${line}`);
  }
  return [numbers[0], numbers[1], numbers[2]];
}

function luminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const WHITE: [number, number, number] = [255, 255, 255];
const SAND: [number, number, number] = [250, 247, 242];

describe('palette contrast', () => {
  const bodyText: [string, [number, number, number]][] = [
    ['text on white', WHITE],
    ['text on sand', SAND],
  ];

  it.each(bodyText)('body copy passes AA %s', (_label, background) => {
    expect(contrast(token('text'), background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(bodyText)('secondary copy passes AA %s', (_label, background) => {
    expect(contrast(token('text-light'), background)).toBeGreaterThanOrEqual(4.5);
  });

  it('headings pass AA on both grounds', () => {
    expect(contrast(token('ink'), WHITE)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('ink'), SAND)).toBeGreaterThanOrEqual(4.5);
  });

  it('action colour works as a link and behind white button text', () => {
    expect(contrast(token('accent'), WHITE)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('accent-light'), WHITE)).toBeGreaterThanOrEqual(4.5);
  });

  it('status colours pass AA as text on white', () => {
    expect(contrast(token('success'), WHITE)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('danger'), WHITE)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('warm'), WHITE)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('blush-deep'), WHITE)).toBeGreaterThanOrEqual(4.5);
  });

  it('decorative colours still clear the 3:1 non-text threshold', () => {
    expect(contrast(token('primary'), WHITE)).toBeGreaterThanOrEqual(3);
    expect(contrast(token('blush'), WHITE)).toBeGreaterThanOrEqual(3);
  });
});
