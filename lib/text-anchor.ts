export const ANCHOR_CONTEXT_LENGTH = 40;

export interface TextAnchor {
  quotedText: string;
  anchorStart: number;
  anchorPrefix: string;
  anchorSuffix: string;
}

export interface ResolvedRange {
  start: number;
  end: number;
}

export function createTextAnchor(text: string, start: number, end: number): TextAnchor {
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(safeStart, Math.min(end, text.length));

  return {
    quotedText: text.slice(safeStart, safeEnd),
    anchorStart: safeStart,
    anchorPrefix: text.slice(Math.max(0, safeStart - ANCHOR_CONTEXT_LENGTH), safeStart),
    anchorSuffix: text.slice(safeEnd, safeEnd + ANCHOR_CONTEXT_LENGTH),
  };
}

function countMatchingSuffixCharacters(expected: string, actual: string): number {
  const limit = Math.min(expected.length, actual.length);
  let matched = 0;
  while (
    matched < limit &&
    expected[expected.length - 1 - matched] === actual[actual.length - 1 - matched]
  ) {
    matched += 1;
  }
  return matched;
}

function countMatchingPrefixCharacters(expected: string, actual: string): number {
  const limit = Math.min(expected.length, actual.length);
  let matched = 0;
  while (matched < limit && expected[matched] === actual[matched]) {
    matched += 1;
  }
  return matched;
}

function scoreOccurrence(text: string, anchor: TextAnchor, index: number): number {
  const precedingText = text.slice(Math.max(0, index - ANCHOR_CONTEXT_LENGTH), index);
  const followingText = text.slice(
    index + anchor.quotedText.length,
    index + anchor.quotedText.length + ANCHOR_CONTEXT_LENGTH
  );

  return (
    countMatchingSuffixCharacters(anchor.anchorPrefix, precedingText) +
    countMatchingPrefixCharacters(anchor.anchorSuffix, followingText)
  );
}

export function resolveTextAnchor(text: string, anchor: TextAnchor): ResolvedRange | null {
  if (!anchor.quotedText) return null;

  const exactEnd = anchor.anchorStart + anchor.quotedText.length;
  if (text.slice(anchor.anchorStart, exactEnd) === anchor.quotedText) {
    return { start: anchor.anchorStart, end: exactEnd };
  }

  let bestIndex = -1;
  let bestScore = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  let index = text.indexOf(anchor.quotedText);
  while (index !== -1) {
    const score = scoreOccurrence(text, anchor, index);
    const distance = Math.abs(index - anchor.anchorStart);

    if (score > bestScore || (score === bestScore && distance < bestDistance)) {
      bestIndex = index;
      bestScore = score;
      bestDistance = distance;
    }

    index = text.indexOf(anchor.quotedText, index + 1);
  }

  if (bestIndex === -1) return null;

  return { start: bestIndex, end: bestIndex + anchor.quotedText.length };
}

export interface HighlightRange extends ResolvedRange {
  commentId: string;
}

export interface HighlightSegment {
  text: string;
  commentIds: string[];
}

export function buildHighlightSegments(text: string, ranges: HighlightRange[]): HighlightSegment[] {
  const usableRanges = ranges.filter((range) => range.end > range.start);
  if (usableRanges.length === 0) {
    return text ? [{ text, commentIds: [] }] : [];
  }

  const boundaries = new Set<number>([0, text.length]);
  for (const range of usableRanges) {
    boundaries.add(Math.max(0, Math.min(range.start, text.length)));
    boundaries.add(Math.max(0, Math.min(range.end, text.length)));
  }

  const sortedBoundaries = [...boundaries].sort((a, b) => a - b);
  const segments: HighlightSegment[] = [];

  for (let position = 0; position < sortedBoundaries.length - 1; position += 1) {
    const start = sortedBoundaries[position];
    const end = sortedBoundaries[position + 1];
    if (end <= start) continue;

    segments.push({
      text: text.slice(start, end),
      commentIds: usableRanges
        .filter((range) => range.start <= start && range.end >= end)
        .map((range) => range.commentId),
    });
  }

  return segments;
}
