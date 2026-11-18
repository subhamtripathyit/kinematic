/**
 * Character counting that treats an emoji (even 👍🏽 or 👨‍👩‍👧) as ONE character,
 * the way people count. The browser's maxLength counts code units, so emojis
 * would count as 2 or more there.
 */
const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

function chars(text: string): string[] {
  return segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text);
}

export function charCount(text: string): number {
  return chars(text).length;
}

/** Cuts text to at most max characters. */
export function clipChars(text: string, max: number): string {
  const all = chars(text);
  return all.length <= max ? text : all.slice(0, max).join('');
}
