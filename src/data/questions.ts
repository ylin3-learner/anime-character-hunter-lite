export interface QuestionData {
  id: string;
  targetNoun: string;
  antecedent: {
    noun: string;
    number: 'singular' | 'plural';
    person: 'person' | 'thing';
  };
  modifierBlock: {
    id: string;
    type: 'relative-clause' | 'prepositional-phrase';
    label: string;
  };
  tiles: string[];
  correctAnswer: string[];
}

// 📚 這裡就是老師的題庫，未來只要往下複製貼上就能擴充題目！
export const questionBank: QuestionData[] = [
  {
    id: 'q1',
    targetNoun: 'The girl',
    antecedent: { noun: 'The girl', number: 'singular', person: 'person' },
    modifierBlock: { id: 'b1', type: 'relative-clause', label: 'who wears a blue uniform' },
    tiles: ['wears', 'uniform', 'who', 'blue', 'a'],
    correctAnswer: ['who', 'wears', 'a', 'blue', 'uniform'],
  },
  {
    id: 'q2',
    targetNoun: 'The boys',
    antecedent: { noun: 'The boys', number: 'plural', person: 'person' },
    modifierBlock: { id: 'b2', type: 'relative-clause', label: 'who play basketball' },
    tiles: ['play', 'who', 'basketball'],
    correctAnswer: ['who', 'play', 'basketball'],
  }
];