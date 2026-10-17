export interface VerbPair {
  singular: string;
  plural: string;
}

export const VERB_PAIRS: readonly VerbPair[] = [
  { singular: 'wears',  plural: 'wear'  },
  { singular: 'has',    plural: 'have'  },
  { singular: 'is',     plural: 'are'   },
  { singular: 'lives',  plural: 'live'  },
  { singular: 'likes',  plural: 'like'  },
  { singular: 'plays',  plural: 'play'  },
  { singular: 'shakes', plural: 'shake' },
] as const;

// O(1) 查表
const VERB_INDEX: ReadonlyMap<string, VerbPair> = new Map(
  VERB_PAIRS.flatMap(p => [
    [p.singular, p],
    [p.plural, p],
  ])
);

export function findVerbPair(verb: string): VerbPair | undefined {
  return VERB_INDEX.get(verb.toLowerCase());
}

export function expectedForm(
  pair: VerbPair,
  number: 'singular' | 'plural'
): string {
  return number === 'singular' ? pair.singular : pair.plural;
}