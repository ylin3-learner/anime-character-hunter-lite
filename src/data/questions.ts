export interface QuestionData {
  id: string;
  type: 'standard' | 'contrast'; // 新增題型
  targetNoun: string;
  antecedent: { noun: string; number: 'singular' | 'plural'; person: 'person' | 'thing' };
  imageUrl: string; // 標準題用
  modifiers: {
    relative: { label: string; tiles: string[]; correctAnswer: string[] };
    preposition: { label: string; tiles: string[]; correctAnswer: string[] };
  };
  // 對比題專屬欄位
  contrastData?: {
    chineseSentence: string;
    chineseHighlight: string;
    nounImage: string;
    modifierImage: string;
  };
}

export const defaultQuestions: QuestionData[] = [
  {
    id: 'q1',
    type: 'standard',
    targetNoun: 'The girl',
    antecedent: { noun: 'The girl', number: 'singular', person: 'person' },
    imageUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AnimeGirl',
    modifiers: {
      relative: {
        label: 'who wears a blue uniform',
        tiles: ['wears', 'uniform', 'who', 'blue', 'a'],
        correctAnswer: ['who', 'wears', 'a', 'blue', 'uniform']
      },
      preposition: {
        label: 'in a blue uniform',
        tiles: ['uniform', 'in', 'blue', 'a'],
        correctAnswer: ['in', 'a', 'blue', 'uniform']
      }
    }
  },
  {
    id: 'q2_contrast',
    type: 'contrast',
    targetNoun: 'The girl',
    antecedent: { noun: 'The girl', number: 'singular', person: 'person' },
    imageUrl: '',
    modifiers: {
      relative: {
        label: 'who wears a blue uniform',
        tiles: ['wears', 'uniform', 'who', 'blue', 'a'],
        correctAnswer: ['who', 'wears', 'a', 'blue', 'uniform']
      },
      preposition: { label: '', tiles: [], correctAnswer: [] }
    },
    contrastData: {
      chineseSentence: '穿藍色制服的女孩',
      chineseHighlight: '穿藍色制服的',
      nounImage: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AnimeGirl',
      modifierImage: 'https://api.dicebear.com/7.x/shapes/svg?seed=Uniform' // 用抽象圖代替制服
    }
  }
];