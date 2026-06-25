import React, { useState } from 'react';
import { X, Trash2, Calendar, AlertCircle, Edit2, Save, Undo2 } from 'lucide-react';
import type { Task, Record as DbRecord } from '../db';

interface TaskDetailModalProps {
  isOpen: boolean;
  task: Task | null;
  records: DbRecord[];
  onClose: () => void;
  onDeleteRecord: (recordId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateRecordTime: (recordId: string, newExecutedAt: number) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  task,
  records,
  onClose,
  onDeleteRecord,
  onDeleteTask,
  onUpdateRecordTime,
}) => {
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [tempDatetime, setTempDatetime] = useState<string>('');

  if (!isOpen || !task) return null;

  const handleDeleteTask = () => {
    const confirmed = window.confirm(
      `本当にタスク「${task.name}」を削除しますか？\nこれまでのすべての実行履歴も同時に削除されます。`
    );
    if (confirmed) {
      onDeleteTask(task.id);
      onClose();
    }
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}/${month}/${date} ${hours}:${minutes}:${seconds}`;
  };

  const getRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < 5000) return 'たった今';
    if (diff < minute) return `${Math.floor(diff / 1000)}秒前`;
    if (diff < hour) return `${Math.floor(diff / minute)}分前`;
    if (diff < day) return `${Math.floor(diff / hour)}時間前`;
    
    const days = Math.floor(diff / day);
    if (days === 1) return '昨日';
    return `${days}日前`;
  };

  const toDatetimeLocalString = (timestamp: number) => {
    const d = new Date(timestamp);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleStartEdit = (recordId: string, currentTimestamp: number) => {
    setEditingRecordId(recordId);
    setTempDatetime(toDatetimeLocalString(currentTimestamp));
  };

  const handleSaveEdit = (recordId: string) => {
    const timestamp = new Date(tempDatetime).getTime();
    if (isNaN(timestamp)) {
      alert('無効な日時です。');
      return;
    }
    if (timestamp > Date.now()) {
      alert('未来の日付には変更できません。');
      return;
    }
    onUpdateRecordTime(recordId, timestamp);
    setEditingRecordId(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content glass-panel" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '450px' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              style={{ 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%', 
                backgroundColor: task.color,
                boxShadow: `0 0 8px ${task.color}`
              }} 
            />
            <h2 className="modal-title" style={{ wordBreak: 'break-all', paddingRight: '8px' }}>
              {task.name}
            </h2>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* タグリスト */}
          {task.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {task.tags.map((tag, idx) => (
                <span key={idx} className="task-tag">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* 履歴セクション */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} /> 実行履歴 ({records.length}回)
            </h3>

            {records.length === 0 ? (
              <div 
                className="empty-state" 
                style={{ padding: '30px 10px', background: 'rgba(255, 255, 255, 0.01)' }}
              >
                <AlertCircle size={24} className="empty-state-icon" />
                <p style={{ fontSize: '0.85rem' }}>記録がありません。右スワイプで記録してください。</p>
              </div>
            ) : (
              <div className="history-list">
                {records.map((record) => {
                  const isEditing = editingRecordId === record.id;
                  return (
                    <div key={record.id} className="history-item" style={{ flexDirection: isEditing ? 'column' : 'row', alignItems: isEditing ? 'stretch' : 'center', gap: isEditing ? '12px' : '8px' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>日時の編集 (過去のみ)</label>
                          <input
                            type="datetime-local"
                            className="form-input"
                            style={{ padding: '8px 12px', fontSize: '0.9rem', width: '100%' }}
                            value={tempDatetime}
                            max={toDatetimeLocalString(Date.now())}
                            onChange={(e) => setTempDatetime(e.target.value)}
                          />
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
                              onClick={() => setEditingRecordId(null)}
                            >
                              <Undo2 size={14} /> キャンセル
                            </button>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
                              onClick={() => handleSaveEdit(record.id)}
                            >
                              <Save size={14} /> 保存
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                            <span className="history-time">{formatDate(record.executedAt)}</span>
                            <span className="history-relative">{getRelativeTime(record.executedAt)}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              className="task-card-btn"
                              onClick={() => handleStartEdit(record.id, record.executedAt)}
                              title="この履歴を編集"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              className="task-card-btn"
                              onClick={() => onDeleteRecord(record.id)}
                              style={{ color: '#ef4444' }}
                              title="この履歴を削除"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '8px 0' }} />

          {/* タスク削除ボタン（危険なアクション） */}
          <button 
            type="button" 
            className="btn btn-danger" 
            onClick={handleDeleteTask}
            style={{ width: '100%' }}
          >
            <Trash2 size={18} /> タスクを削除する
          </button>
        </div>
      </div>
    </div>
  );
};
