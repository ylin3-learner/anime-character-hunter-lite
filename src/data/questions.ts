export interface QuestionData {
  id: string;
  type: 'standard' | 'contrast';
  targetNoun: string;
  antecedent: {
    noun: string;
    number: 'singular' | 'plural';
    person: 'person' | 'thing';
  };
  imageUrl: string;
  grammarFeature: {
    relative: { label: string; tiles: string[]; correctAnswer: string[] };
    preposition: { label: string; tiles: string[]; correctAnswer: string[] };
  };
  inputData?: {
    audioText: string;
    options: { image: string; text: string; isCorrect: boolean }[];
  };
  // 👇 新增意識提升歸納板的資料
  noticingData?: {
    examples: string[];
    question: string;
    options: { text: string; isCorrect: boolean }[];
    explanation: string;
  };
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
    grammarFeature: {
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
    },
    inputData: {
      audioText: 'The girl who wears a blue uniform is my sister.',
      options: [
        { image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AnimeGirl', text: '穿藍色制服的女孩', isCorrect: true },
        { image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=OtherGirl', text: '穿紅色洋裝的女孩', isCorrect: false }
      ]
    },
    // 👇 填入歸納板的內容
    noticingData: {
      examples: [
        'The girl who wears a blue uniform is my sister.',
        'The boy who plays basketball is my brother.'
      ],
      question: '請觀察這兩個句子，關係代名詞 who 代替的是什麼？',
      options: [
        { text: '事物（Things）', isCorrect: false },
        { text: '人（People）', isCorrect: true }
      ],
      explanation: '沒錯！當先行詞是「人」的時候，我們使用 who 來引導關係子句。'
    }
  }
];