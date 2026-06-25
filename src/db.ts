import Dexie, { type Table } from 'dexie';

export interface Task {
  id: string; // UUID (String)
  name: string; // タスク名
  color: string; // テーマカラーのHEXコード
  tags: string[]; // タグの配列
  createdAt: number; // 作成日時 (タイムスタンプ)
  intervalDays?: number; // 目標サイクル (日数)
}

export interface Record {
  id: string; // UUID (String)
  taskId: string; // 紐づくタスクのID
  executedAt: number; // 実行日時 (タイムスタンプ)
}

export class LastDoneDatabase extends Dexie {
  tasks!: Table<Task, string>;
  records!: Table<Record, string>;

  constructor() {
    super('LastDoneDatabase');
    this.version(1).stores({
      tasks: 'id, name, createdAt',
      records: 'id, taskId, executedAt, [taskId+executedAt]'
    });
  }
}

export const db = new LastDoneDatabase();

// ユーティリティ: UUID生成
export function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  // フォールバック
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
