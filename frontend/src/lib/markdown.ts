import Slugger from 'github-slugger';

export type TocEntry = {
  id: string;
  text: string;
  level: number;
};

export function extractToc(markdown: string): TocEntry[] {
  const slugger = new Slugger();
  const entries: TocEntry[] = [];
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim().replace(/[#*`]/g, '').trim();
    const id = slugger.slug(text);
    entries.push({ id, text, level });
  }
  return entries;
}
