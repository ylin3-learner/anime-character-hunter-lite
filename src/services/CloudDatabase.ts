import type { QuestionData } from '../data/questions';
import { supabase } from './supabaseClient';

export const CloudDatabase = {
  // 從雲端抓取題庫
  async fetchQuestions(): Promise<QuestionData[] | null> {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('data')
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      return data.map((row: any) => row.data) as QuestionData[];
    } catch (error) {
      console.error('無法連線到雲端資料庫:', error);
      return null;
    }
  },

  // 將題庫存到雲端 (使用 upsert 實現覆蓋更新)
  async saveQuestions(questions: QuestionData[]): Promise<boolean> {
    try {
      // 先清空舊資料 (可選，確保題庫完全同步)
      await supabase.from('questions').delete().neq('id', '0');

      // 批次插入新題目
      const rows = questions.map(q => ({
        id: q.id,
        data: q
      }));

      const { error } = await supabase.from('questions').insert(rows);
      if (error) throw error;

      return true;
    } catch (error) {
      console.error('儲存到雲端失敗:', error);
      return false;
    }
  }
};