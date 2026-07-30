export interface SearchableMedia {
  nb: string;
  ar_title?: string;
  en_title?: string;
  stars?: string;
}

const SEARCH_STOP_WORDS = new Set(['a', 'an', 'the']);

const ARABIC_EN_MAP: Record<string, string> = {
  'باتمان': 'batman',
  'سبايدرمان': 'spider-man',
  'سوبرمان': 'superman',
  'انتقام': 'avengers',
  'المنتقمون': 'avengers',
  'هاري بوتر': 'harry potter',
  'جوكر': 'joker',
  'تيتانيك': 'titanic',
  'ماتريكس': 'matrix',
  'ترانسفورمرز': 'transformers',
  'توب غان': 'top gun',
  'فاست': 'fast',
  'افاتار': 'avatar',
  'أفاتار': 'avatar',
};

export function normalizeMediaSearchQuery(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\u0640\u064B-\u065F\u0670]/g, '')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function withoutStopWords(query: string): string {
  const meaningfulTokens = query
    .split(' ')
    .filter((token) => token && !SEARCH_STOP_WORDS.has(token));

  return meaningfulTokens.length > 0 ? meaningfulTokens.join(' ') : query;
}

function mappedEnglishQuery(query: string): string | undefined {
  for (const [arabic, english] of Object.entries(ARABIC_EN_MAP)) {
    if (query.includes(normalizeMediaSearchQuery(arabic))) return english;
  }
  return undefined;
}

export function getMediaSearchQueryVariants(value: string): string[] {
  const normalized = normalizeMediaSearchQuery(value);
  if (!normalized) return [];

  const variants = [normalized];
  const stripped = withoutStopWords(normalized);
  if (stripped !== normalized) variants.push(stripped);

  const mapped = mappedEnglishQuery(normalized);
  if (mapped) {
    const normalizedMapped = normalizeMediaSearchQuery(mapped);
    variants.push(normalizedMapped);
    const strippedMapped = withoutStopWords(normalizedMapped);
    if (strippedMapped !== normalizedMapped) variants.push(strippedMapped);
  }

  return [...new Set(variants.filter(Boolean))];
}

export function dedupeMediaById<T extends SearchableMedia>(items: T[]): T[] {
  return [...new Map(items.map((item) => [item.nb, item])).values()];
}

function getMatchScore(item: SearchableMedia, queries: string[]): [number, number] {
  const titles = [item.ar_title, item.en_title]
    .map((title) => normalizeMediaSearchQuery(title || ''))
    .filter(Boolean);
  let best: [number, number] = [3, queries.length];

  queries.forEach((query, queryIndex) => {
    for (const title of titles) {
      const matchType = title === query ? 0 : title.startsWith(query) ? 1 : title.includes(query) ? 2 : 3;
      if (matchType < best[0] || (matchType === best[0] && queryIndex < best[1])) {
        best = [matchType, queryIndex];
      }
    }
  });

  return best;
}

export function rankMediaResults<T extends SearchableMedia>(items: T[], query: string): T[] {
  const variants = getMediaSearchQueryVariants(query);

  return [...items].sort((a, b) => {
    const [matchA, variantA] = getMatchScore(a, variants);
    const [matchB, variantB] = getMatchScore(b, variants);
    if (matchA !== matchB) return matchA - matchB;
    if (variantA !== variantB) return variantA - variantB;

    return (Number.parseFloat(b.stars || '') || 0) - (Number.parseFloat(a.stars || '') || 0);
  });
}
