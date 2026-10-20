export interface VerbPair {
  singular: string;
  plural: string;
}

// 只列 Unit 5 課本會出現的動詞對，避免亂猜
export const VERB_PAIRS: readonly VerbPair[] = [
  { singular: 'wears',   plural: 'wear'   },
  { singular: 'has',     plural: 'have'   },
  { singular: 'is',      plural: 'are'    },
  { singular: 'was',     plural: 'were'   }, // p.107「which was hit by a car」「who was making noise」
  { singular: 'lives',   plural: 'live'   },
  { singular: 'likes',   plural: 'like'   },
  { singular: 'plays',   plural: 'play'   },
  { singular: 'shakes',  plural: 'shake'  },
  { singular: 'stands',  plural: 'stand'  }, // p.107「The churches stand on the hill」
  { singular: 'looks',   plural: 'look'   }, // p.107「The churches look old」
  { singular: 'leads',   plural: 'lead'   }, // p.98「the line that leads to that booth」
  { singular: 'owns',    plural: 'own'    }, // p.103「Mia owns a coffee shop」
  { singular: 'belongs', plural: 'belong' }, // p.103「belongs to Ms. Starr」
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