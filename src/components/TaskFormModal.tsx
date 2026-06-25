import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Task } from '../db';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; color: string; tags: string[]; intervalDays?: number }) => void;
  editingTask?: Task | null;
  existingTags?: string[];
}

const COLOR_PALETTE = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#64748b', // Slate
];

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingTask,
  existingTags = [],
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[6]); // デフォルトはインディゴ
  const [tagsInput, setTagsInput] = useState('');
  const [intervalDays, setIntervalDays] = useState('');

  // 編集モードの場合の初期値設定
  useEffect(() => {
    if (editingTask) {
      setName(editingTask.name);
      setColor(editingTask.color);
      setTagsInput(editingTask.tags.join(', '));
      setIntervalDays(editingTask.intervalDays ? String(editingTask.intervalDays) : '');
    } else {
      setName('');
      setColor(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]); // ランダムに初期色を決定
      setTagsInput('');
      setIntervalDays('');
    }
  }, [editingTask, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // タグ入力をパース（カンマまたはスペース区切り、重複排除、空文字排除）
    const parsedTags = tagsInput
      .split(/[,，、\s]+/)
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const parsedInterval = intervalDays.trim() ? parseInt(intervalDays.trim(), 10) : undefined;

    onSubmit({
      name: name.trim(),
      color,
      tags: Array.from(new Set(parsedTags)),
      intervalDays: parsedInterval && parsedInterval > 0 ? parsedInterval : undefined,
    });
    onClose();
  };

  const handleTagChipClick = (tag: string) => {
    const currentTags = tagsInput
      .split(/[,，、\s]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (!currentTags.includes(tag)) {
      const newTags = [...currentTags, tag];
      setTagsInput(newTags.join(', '));
    }
  };

  const defaultTags = ['掃除', '習慣'];
  const displayTags = Array.from(new Set([...defaultTags, ...existingTags]));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content glass-panel" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            {editingTask ? 'タスクを編集' : '新しいタスクを作成'}
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* タスク名 */}
          <div className="form-group">
            <label className="form-label">タスク名</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* タグ入力 */}
          <div className="form-group">
            <label className="form-label">タグ (カンマ区切り)</label>
            <input
              type="text"
              className="form-input"
              placeholder="例: 掃除, 毎週, 屋内"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
            {displayTags.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <span className="form-label" style={{ fontSize: '0.75rem', display: 'block', marginBottom: '6px' }}>
                  既存のタグから選択:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {displayTags.map((tag) => (
                    <span
                      key={tag}
                      className="task-tag"
                      style={{ cursor: 'pointer', backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                      onClick={() => handleTagChipClick(tag)}
                    >
                      +{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 目標サイクル */}
          <div className="form-group">
            <label className="form-label">目標サイクル (日数)</label>
            <input
              type="number"
              className="form-input"
              placeholder="例: 7 (7日ごと、空欄で目標なし)"
              value={intervalDays}
              onChange={(e) => setIntervalDays(e.target.value)}
              min="1"
            />
          </div>

          {/* カラー選択 */}
          <div className="form-group">
            <label className="form-label">テーマカラー</label>
            <div className="color-palette">
              {COLOR_PALETTE.map((c) => (
                <div
                  key={c}
                  className={`color-option ${color === c ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {/* アクションボタン */}
          <div className="btn-container">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
              保存する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
