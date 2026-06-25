import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { Check, Clock, Edit, History } from 'lucide-react';
import type { Task } from '../db';

interface SwipeableTaskCardProps {
  task: Task;
  lastRecordTime?: number;
  onComplete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onShowHistory: (task: Task) => void;
}

export function formatRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) return '未実施';
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
  if (days < 7) return `${days}日前`;

  const date = new Date(timestamp);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export const SwipeableTaskCard: React.FC<SwipeableTaskCardProps> = ({
  task,
  lastRecordTime,
  onComplete,
  onEdit,
  onShowHistory,
}) => {
  const [relativeTime, setRelativeTime] = useState<string>(
    formatRelativeTime(lastRecordTime)
  );
  const [isSwipedPastThreshold, setIsSwipedPastThreshold] = useState(false);
  const [hasVibrated, setHasVibrated] = useState(false);
  const controls = useAnimation();
  const SWIPE_THRESHOLD = 110; // トリガーするスワイプ距離(px)

  const isOverdue = 
    !!(task.intervalDays && 
    task.intervalDays > 0 && 
    lastRecordTime && 
    (Date.now() - lastRecordTime > task.intervalDays * 24 * 60 * 60 * 1000));

  // 1分ごとに経過時間を更新
  useEffect(() => {
    setRelativeTime(formatRelativeTime(lastRecordTime));

    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(lastRecordTime));
    }, 30000); // 30秒ごとに更新してリアルタイム性を高める

    return () => clearInterval(interval);
  }, [lastRecordTime]);

  const handleDrag = (_event: any, info: PanInfo) => {
    const xOffset = info.offset.x;

    // スワイプがしきい値を超えたかチェック
    if (xOffset >= SWIPE_THRESHOLD) {
      setIsSwipedPastThreshold(true);
      if (!hasVibrated) {
        // Haptic Feedback
        if (navigator.vibrate) {
          navigator.vibrate(15);
        }
        setHasVibrated(true);
      }
    } else {
      setIsSwipedPastThreshold(false);
      if (xOffset < SWIPE_THRESHOLD - 10) {
        // しきい値を少し下回ったらバイブレーション可能状態に戻す(バウンス防止)
        setHasVibrated(false);
      }
    }
  };

  const handleDragEnd = async (_event: any, info: PanInfo) => {
    const xOffset = info.offset.x;

    if (xOffset >= SWIPE_THRESHOLD) {
      // 成功時: 右にシュッとスライドさせて消えるアニメーション
      await controls.start({
        x: '100%',
        opacity: 0,
        transition: { duration: 0.2, ease: 'easeOut' },
      });

      // 完了イベント発火
      onComplete(task.id);

      // バイブレーション（追加で完了感）
      if (navigator.vibrate) {
        navigator.vibrate([10, 30, 10]);
      }

      // 位置と透明度をフェードインで戻す
      controls.set({ x: '-10%', opacity: 0 });
      await controls.start({
        x: 0,
        opacity: 1,
        transition: { duration: 0.3, ease: 'easeOut' },
      });
    } else {
      // 失敗時: 元の位置に戻す
      controls.start({
        x: 0,
        opacity: 1,
        transition: { type: 'spring', stiffness: 300, damping: 20 },
      });
    }
    
    setIsSwipedPastThreshold(false);
    setHasVibrated(false);
  };

  return (
    <div className="task-card-wrapper">
      {/* スワイプされた時に下に表示される完了アクション背景 */}
      <div 
        className="task-card-bg-action"
        style={{
          opacity: Math.min(1, isSwipedPastThreshold ? 1 : 0.4),
        }}
      >
        <span 
          className="task-card-bg-action-icon"
          style={{
            transform: isSwipedPastThreshold ? 'scale(1.2)' : 'scale(1)',
          }}
        >
          <Check size={22} />
          {isSwipedPastThreshold && <span>完了！</span>}
        </span>
      </div>

      {/* スワイプ可能なカード本体 */}
      <motion.div
        className="task-card"
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 300 }}
        dragElastic={{ left: 0.05, right: 0.6 }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={controls}
        whileTap={{ cursor: 'grabbing' }}
      >
        {/* タスクカラーを表す左側のバー */}
        <div 
          className="task-card-glow" 
          style={{ backgroundColor: task.color }}
        />

        <div className="task-card-header">
          <div className="task-card-info">
            <h3 className="task-card-name">{task.name}</h3>
            <p className="task-card-time" style={{ color: isOverdue ? '#ef4444' : 'var(--text-secondary)' }}>
              <Clock size={14} style={{ color: isOverdue ? '#ef4444' : 'inherit' }} />
              前回: <span className="task-card-time-highlight" style={{ color: isOverdue ? '#ef4444' : 'var(--text-primary)', fontWeight: isOverdue ? 700 : 500 }}>{relativeTime}</span>
              {isOverdue && (
                <span style={{ fontSize: '0.75rem', fontWeight: 700, marginLeft: '6px', color: '#ef4444' }}>
                  (期限切れ)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* タグとアクションボタンのエリア */}
        <div className="task-card-header" style={{ alignItems: 'center', marginTop: '4px' }}>
          <div className="task-card-tags">
            {task.tags.map((tag, idx) => (
              <span key={idx} className="task-tag">
                #{tag}
              </span>
            ))}
          </div>

          <div className="task-card-actions">
            <button 
              className="task-card-btn" 
              onClick={(e) => {
                e.stopPropagation();
                onShowHistory(task);
              }}
              title="履歴を表示"
            >
              <History size={18} />
            </button>
            <button 
              className="task-card-btn" 
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              title="編集"
            >
              <Edit size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
