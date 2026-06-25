import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react';
import type { Task, Record as DbRecord } from '../db';

interface CalendarViewProps {
  tasks: Task[];
  records: DbRecord[];
  onDeleteRecord?: (recordId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  records,
  onDeleteRecord,
}) => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // タスクの参照用マップを作成
  const tasksMap = useMemo(() => {
    const map: { [id: string]: Task } = {};
    tasks.forEach((t) => {
      map[t.id] = t;
    });
    return map;
  }, [tasks]);

  // レコードを日付(YYYY-MM-DD)ごとにグループ化
  const recordsByDate = useMemo(() => {
    const groups: { [dateStr: string]: { record: DbRecord; task?: Task }[] } = {};
    
    records.forEach((record) => {
      const d = new Date(record.executedAt);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      
      groups[dateStr].push({
        record,
        task: tasksMap[record.taskId],
      });
    });

    // 各日付内で実行時間の新しい順にソート
    Object.keys(groups).forEach((dateStr) => {
      groups[dateStr].sort((a, b) => b.record.executedAt - a.record.executedAt);
    });

    return groups;
  }, [records, tasksMap]);

  // カレンダーの日付セルを生成
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) - 6 (Sat)
    
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDays = lastDayOfMonth.getDate();
    
    const days: { date: Date; isCurrentMonth: boolean; dateStr: string }[] = [];
    
    // 前月の末尾の日付を埋める
    const prevMonthLast = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLast - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ date: d, isCurrentMonth: false, dateStr });
    }
    
    // 当月の日付を埋める
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ date: d, isCurrentMonth: true, dateStr });
    }
    
    // 翌月の先頭の日付を埋めてグリッド(7列)を揃える (合計が7の倍数になるように)
    const remainingDays = 42 - days.length; // 6週間分固定で描画
    for (let i = 1; i <= remainingDays; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ date: d, isCurrentMonth: false, dateStr });
    }
    
    return days;
  }, [year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // 選択された日の詳細データ
  const selectedDayData = recordsByDate[selectedDateStr] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* カレンダーコントロール */}
      <div 
        className="glass-panel" 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '12px 16px', 
          borderRadius: '16px' 
        }}
      >
        <button className="btn-icon" onClick={handlePrevMonth} style={{ width: '36px', height: '36px' }}>
          <ChevronLeft size={20} />
        </button>
        <span style={{ fontFamily: 'var(--font-primary)', fontWeight: 700, fontSize: '1.1rem' }}>
          {year}年 {month + 1}月
        </span>
        <button className="btn-icon" onClick={handleNextMonth} style={{ width: '36px', height: '36px' }}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* カレンダー本体 */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '16px', 
          borderRadius: '20px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px' 
        }}
      >
        {/* 曜日ヘッダー */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center' }}>
          {['日', '月', '火', '水', '木', '金', '土'].map((w, idx) => (
            <span 
              key={w} 
              style={{ 
                fontSize: '0.8rem', 
                fontWeight: 600, 
                color: idx === 0 ? '#ef4444' : idx === 6 ? '#3b82f6' : 'var(--text-muted)' 
              }}
            >
              {w}
            </span>
          ))}
        </div>

        {/* 日付グリッド */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
          {calendarDays.map(({ date, isCurrentMonth, dateStr }) => {
            const isSelected = selectedDateStr === dateStr;
            const dayRecords = recordsByDate[dateStr] || [];
            const isToday = 
              date.getDate() === today.getDate() && 
              date.getMonth() === today.getMonth() && 
              date.getFullYear() === today.getFullYear();

            return (
              <div
                key={dateStr}
                onClick={() => setSelectedDateStr(dateStr)}
                style={{
                  aspectRatio: '1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  position: 'relative',
                  backgroundColor: isSelected 
                    ? 'var(--accent)' 
                    : isToday 
                      ? 'var(--border-glow)' 
                      : 'transparent',
                  border: isSelected 
                    ? '1px solid #ffffff30' 
                    : isToday 
                      ? '1px solid var(--accent)' 
                      : '1px solid transparent',
                  color: isSelected
                    ? '#ffffff'
                    : isCurrentMonth
                      ? 'var(--text-primary)'
                      : 'var(--text-muted)',
                  opacity: isCurrentMonth ? 1 : 0.4,
                  transition: 'all 0.2s ease',
                }}
              >
                {/* 日付の数値 */}
                <span style={{ fontSize: '0.95rem', fontWeight: isToday || isSelected ? 700 : 500 }}>
                  {date.getDate()}
                </span>

                {/* 実行されたタスクのインジケータ（ドット） */}
                {dayRecords.length > 0 && (
                  <div 
                    style={{ 
                      display: 'flex', 
                      gap: '3px', 
                      position: 'absolute', 
                      bottom: '4px',
                      justifyContent: 'center',
                      width: '80%',
                      overflow: 'hidden'
                    }}
                  >
                    {dayRecords.slice(0, 3).map(({ record, task }) => (
                      <span
                        key={record.id}
                        style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          backgroundColor: isSelected ? '#ffffff' : (task?.color || 'var(--text-muted)'),
                          boxShadow: isSelected ? 'none' : `0 0 4px ${task?.color || '#000'}80`,
                        }}
                      />
                    ))}
                    {dayRecords.length > 3 && (
                      <span 
                        style={{ 
                          fontSize: '0.55rem', 
                          lineHeight: '5px', 
                          fontWeight: 700,
                          color: isSelected ? '#ffffff' : 'var(--text-secondary)'
                        }}
                      >
                        +
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 選択された日のアクティビティ詳細 */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '20px', 
          borderRadius: '20px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px' 
        }}
      >
        <h3 
          className="form-label" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontSize: '0.95rem',
            borderBottom: '1px solid var(--glass-border)',
            paddingBottom: '8px'
          }}
        >
          <CalendarIcon size={16} /> 
          {selectedDateStr.replace('-', '年').replace('-', '月') + '日'} の記録
        </h3>

        {selectedDayData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
            <AlertCircle size={24} style={{ marginBottom: '6px', opacity: 0.5 }} />
            <p style={{ fontSize: '0.85rem' }}>この日の実行記録はありません。</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto' }}>
            {selectedDayData.map(({ record, task }) => (
              <div 
                key={record.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '10px 14px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* カラーバー */}
                  <div 
                    style={{ 
                      width: '8px', 
                      height: '24px', 
                      borderRadius: '4px', 
                      backgroundColor: task?.color || 'var(--text-muted)' 
                    }} 
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                      {task?.name || '削除されたタスク'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {formatTime(record.executedAt)}
                    </span>
                  </div>
                </div>

                {onDeleteRecord && (
                  <button
                    onClick={() => {
                      if (window.confirm(`「${task?.name}」のこの日時の記録を削除しますか？`)) {
                        onDeleteRecord(record.id);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      padding: '4px'
                    }}
                  >
                    削除
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
