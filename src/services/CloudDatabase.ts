import type { QuestionData } from '../data/questions';
import { supabase } from './supabaseClient';

// 新增：學習軌跡型別
export interface LearningLog {
  id?: number;
  student_name: string;
  question_id: string;
  error_code: string;
  created_at?: string;
}

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

  // 將題庫存到雲端
  async saveQuestions(questions: QuestionData[]): Promise<boolean> {
    try {
      const rows = questions.map(q => ({
        id: q.id,
        data: q
      }));

      // 👇 改用 upsert，並指定以 id 作為衝突判定
      const { error } = await supabase
        .from('questions')
        .upsert(rows, { onConflict: 'id' });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('儲存到雲端失敗:', error);
      return false;
    }
  },

  // 新增：寫入學習軌跡
  async logEvent(log: LearningLog): Promise<void> {
    try {
      console.log('🚀 準備寫入軌跡:', log);
      const { error } = await supabase.from('learning_logs').insert([log]);
      if (error) console.error('寫入紀錄失敗:', error);
    } catch (e) {
      console.error('連線錯誤:', e);
    }
  },

  // 新增：讀取所有學習軌跡 (給教師儀表板用)
  async fetchLogs(): Promise<LearningLog[]> {
    try {
      const { data, error } = await supabase
        .from('learning_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('無法取得紀錄:', e);
      return [];
    }
  },

  // 👇 新增：批次刪除所有學習軌跡
  async clearAllLogs(): Promise<boolean> {
    try {
      // 這裡使用 batch delete，條件是 id 不等於 0 (等於刪除所有)
      // 這比一筆一筆刪除快非常多
      const { error } = await supabase
        .from('learning_logs')
        .delete()
        .neq('id', 0);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('清空軌跡失敗:', error);
      return false;
    }
  }
};