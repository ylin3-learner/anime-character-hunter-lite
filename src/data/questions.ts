export interface QuestionData {
  id: string;
  targetNoun: string;
  antecedent: {
    noun: string;
    number: 'singular' | 'plural';
    person: 'person' | 'thing';
  };
  imageUrl: string; // 新增圖片
  // 雙文法圖塊
  modifiers: {
    relative: { label: string; tiles: string[]; correctAnswer: string[] };
    preposition: { label: string; tiles: string[]; correctAnswer: string[] };
  };
}

export const defaultQuestions: QuestionData[] = [
  {
    id: 'q1',
    targetNoun: 'The girl',
    antecedent: { noun: 'The girl', number: 'singular', person: 'person' },
    imageUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=AnimeGirl', // 免費測試用大頭貼
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
  }
];