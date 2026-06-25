import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Settings, Filter, Download, X, Sun, Moon, Clock, HelpCircle } from 'lucide-react';
import { db, generateUUID } from './db';
import type { Task, Record as DbRecord } from './db';
import { SwipeableTaskCard } from './components/SwipeableTaskCard';
import { TaskFormModal } from './components/TaskFormModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { CalendarView } from './components/CalendarView';
import { HelpModal } from './components/HelpModal';

export default function App() {
  // モーダル表示状態
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // タブ選択状態
  const [activeTab, setActiveTab] = useState<'tasks' | 'calendar'>('tasks');

  // ソート選択状態
  const [sortBy, setSortBy] = useState<string>('createdAtDesc');

  // PWAインストール関連の状態
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isInstallHelpOpen, setIsInstallHelpOpen] = useState(false);

  // テーマ関連の状態
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('theme') as 'dark' | 'light') || 'light'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // すでにスタンドアロンモード（アプリモード）で起動しているかチェック
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;

    if (isStandalone) {
      setShowInstallBtn(false);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // iOS Safariの場合は beforeinstallprompt が発生しないが、
    // スタンドアロンでない場合は常にインストールガイドを表示するためのボタンを出しておく
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS && !isStandalone) {
      setShowInstallBtn(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallBtn(false);
      }
    } else {
      // iOSや他ブラウザ向けにヘルプモーダルを開く
      setIsInstallHelpOpen(true);
    }
  };

  // 選択中のタスク
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // フィルター状態
  const [selectedTag, setSelectedTag] = useState<string>('すべて');

  // DBデータのリアクティブロード
  const tasks = useLiveQuery(() => db.tasks.reverse().toArray()) || ([] as Task[]);

  // 全レコードのリアクティブロード（カレンダー用）
  const allRecords = useLiveQuery(() => db.records.toArray()) || ([] as DbRecord[]);
  
  // 各タスクの最新レコードをマップ化して取得
  const latestRecordsMap = useLiveQuery(async () => {
    const allRecords = await db.records.toArray();
    const map: { [taskId: string]: number } = {};
    allRecords.forEach((r) => {
      if (!map[r.taskId] || r.executedAt > map[r.taskId]) {
        map[r.taskId] = r.executedAt;
      }
    });
    return map;
  }) || {};

  // 選択タスクのすべての実行履歴（最新順）
  const selectedTaskRecords = useLiveQuery<DbRecord[]>(
    () => {
      if (!selectedTask) return Promise.resolve([] as DbRecord[]);
      return db.records
        .where('taskId')
        .equals(selectedTask.id)
        .reverse()
        .sortBy('executedAt');
    },
    [selectedTask]
  ) || ([] as DbRecord[]);

  // 全タスクから利用されている一意のタグ一覧を抽出
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    tasks.forEach((task) => {
      task.tags.forEach((tag) => tagsSet.add(tag));
    });
    return ['すべて', '期限切れ', ...Array.from(tagsSet)];
  }, [tasks]);

  // 表示するタスクのフィルタリング
  const filteredTasks = useMemo(() => {
    if (selectedTag === 'すべて') return tasks;
    if (selectedTag === '期限切れ') {
      return tasks.filter((task) => {
        const lastTime = latestRecordsMap[task.id];
        return (
          task.intervalDays &&
          task.intervalDays > 0 &&
          lastTime &&
          Date.now() - lastTime > task.intervalDays * 24 * 60 * 60 * 1000
        );
      });
    }
    return tasks.filter((task) => task.tags.includes(selectedTag));
  }, [tasks, selectedTag, latestRecordsMap]);

  // フィルタリングされたタスクの並べ替え
  const sortedTasks = useMemo(() => {
    const list = [...filteredTasks];
    if (sortBy === 'createdAtDesc') {
      list.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortBy === 'lastExecutedAsc') {
      list.sort((a, b) => {
        const timeA = latestRecordsMap[a.id] || 0;
        const timeB = latestRecordsMap[b.id] || 0;
        return timeA - timeB;
      });
    } else if (sortBy === 'lastExecutedDesc') {
      list.sort((a, b) => {
        const timeA = latestRecordsMap[a.id] || 0;
        const timeB = latestRecordsMap[b.id] || 0;
        return timeB - timeA;
      });
    } else if (sortBy === 'overdueUrgency') {
      list.sort((a, b) => {
        const getUrgencyScore = (task: Task) => {
          const lastTime = latestRecordsMap[task.id];
          if (!task.intervalDays || task.intervalDays <= 0) return -999999;
          if (!lastTime) return 999999; // 未実施は最優先
          const elapsed = Date.now() - lastTime;
          const target = task.intervalDays * 24 * 60 * 60 * 1000;
          return elapsed - target;
        };
        return getUrgencyScore(b) - getUrgencyScore(a);
      });
    }
    return list;
  }, [filteredTasks, sortBy, latestRecordsMap]);

  // ハンドラー: タスク完了の記録 (スワイプ成功時)
  const handleCompleteTask = async (taskId: string) => {
    const newRecord: DbRecord = {
      id: generateUUID(),
      taskId,
      executedAt: Date.now(),
    };
    await db.records.add(newRecord);
  };

  // ハンドラー: タスク新規作成・編集のコミット
  const handleFormSubmit = async (data: { name: string; color: string; tags: string[]; intervalDays?: number }) => {
    if (editingTask) {
      // 編集
      await db.tasks.update(editingTask.id, {
        name: data.name,
        color: data.color,
        tags: data.tags,
        intervalDays: data.intervalDays,
      });
      setEditingTask(null);
    } else {
      // 新規作成
      const newTask: Task = {
        id: generateUUID(),
        name: data.name,
        color: data.color,
        tags: data.tags,
        createdAt: Date.now(),
        intervalDays: data.intervalDays,
      };
      await db.tasks.add(newTask);
    }
  };

  // ハンドラー: 履歴の個別削除
  const handleDeleteRecord = async (recordId: string) => {
    await db.records.delete(recordId);
  };

  // ハンドラー: 履歴日時の更新
  const handleUpdateRecordTime = async (recordId: string, newExecutedAt: number) => {
    if (newExecutedAt > Date.now()) {
      alert('未来の日付には変更できません。');
      return;
    }
    await db.records.update(recordId, { executedAt: newExecutedAt });
  };

  // ハンドラー: タスクの削除 (履歴もカスケード削除)
  const handleDeleteTask = async (taskId: string) => {
    await db.transaction('rw', [db.tasks, db.records], async () => {
      await db.tasks.delete(taskId);
      await db.records.where('taskId').equals(taskId).delete();
    });
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }
  };

  return (
    <>
      {/* アプリケーションヘッダー */}
      <header className="app-header glass-panel">
        <div className="logo">
          <div className="logo-icon">
            <Clock size={20} color="#ffffff" />
          </div>
          <h1>イツヤッタ</h1>
        </div>
        <div className="header-actions">
          {showInstallBtn && (
            <button
              className="btn-icon"
              onClick={handleInstallApp}
              style={{ background: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.25)', color: '#10b981' }}
              title="ホーム画面に追加してアプリ化"
            >
              <Download size={18} />
            </button>
          )}
          <button
            className="btn-icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            className="btn-icon"
            onClick={() => setIsHelpOpen(true)}
            title="使い方を見る"
          >
            <HelpCircle size={20} />
          </button>
          <button 
            className="btn-icon" 
            onClick={() => setIsSettingsOpen(true)}
            title="設定・バックアップ"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* タブ切り替えバー */}
      <div className="tab-bar-container" style={{ margin: '0 auto 16px auto', maxWidth: '600px', width: 'calc(100% - 32px)' }}>
        <button 
          className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          タスク一覧
        </button>
        <button 
          className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          カレンダー
        </button>
      </div>

      {/* メインレイアウト */}
      <main className="main-container">
        {activeTab === 'tasks' ? (
          <>
            {/* タグによる絞り込みチップ */}
            {allTags.length > 1 && (
              <div className="tag-filter-container">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    className={`tag-chip ${selectedTag === tag ? 'active' : ''}`}
                    onClick={() => setSelectedTag(tag)}
                  >
                    {tag === 'すべて' || tag === '期限切れ' ? tag : `#${tag}`}
                  </button>
                ))}
              </div>
            )}

            {/* ソートセレクター */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 12px 0', padding: '0 4px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {sortedTasks.length} 件のタスク
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="form-input"
                style={{
                  padding: '6px 28px 6px 12px',
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              >
                <option value="createdAtDesc">作成日 (新しい順)</option>
                <option value="lastExecutedAsc">前回実行 (古い順)</option>
                <option value="lastExecutedDesc">前回実行 (新しい順)</option>
                <option value="overdueUrgency">期限超過/猶予順</option>
              </select>
            </div>

            {/* タスク一覧 */}
            <section className="task-list">
              {sortedTasks.length === 0 ? (
                <div className="empty-state">
                  <Filter size={32} className="empty-state-icon" />
                  <h3>タスクが見つかりません</h3>
                  <p>
                    {selectedTag !== 'すべて' 
                      ? selectedTag === '期限切れ'
                        ? '期限切れのタスクはありません。順調です！'
                        : `タグ「#${selectedTag}」の登録タスクはありません。` 
                      : '右下の「＋」ボタンから最初のタスクを作成しましょう！'}
                  </p>
                </div>
              ) : (
                sortedTasks.map((task) => (
                  <SwipeableTaskCard
                    key={task.id}
                    task={task}
                    lastRecordTime={latestRecordsMap[task.id]}
                    onComplete={handleCompleteTask}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setIsFormOpen(true);
                    }}
                    onShowHistory={(t) => {
                      setSelectedTask(t);
                      setIsDetailOpen(true);
                    }}
                  />
                ))
              )}
            </section>
          </>
        ) : (
          <CalendarView 
            tasks={tasks} 
            records={allRecords} 
            onDeleteRecord={handleDeleteRecord} 
          />
        )}
      </main>

      {/* フローティングアクションボタン(FAB) */}
      {activeTab === 'tasks' && (
        <button 
          className="fab" 
          onClick={() => {
            setEditingTask(null);
            setIsFormOpen(true);
          }}
          title="タスクを追加"
        >
          <Plus size={28} />
        </button>
      )}

      {/* タスク作成・編集モーダル */}
      <TaskFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleFormSubmit}
        editingTask={editingTask}
        existingTags={allTags.filter((t) => t !== 'すべて')}
      />

      {/* タスク詳細・履歴モーダル */}
      <TaskDetailModal
        isOpen={isDetailOpen}
        task={selectedTask}
        records={selectedTaskRecords}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTask(null);
        }}
        onDeleteRecord={handleDeleteRecord}
        onDeleteTask={handleDeleteTask}
        onUpdateRecordTime={handleUpdateRecordTime}
      />
      {/* アプリ設定・エクスポート復元モーダル */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onDataImported={() => {
          // インポート時に必要に応じて処理（Dexieはライブバインドなので自動更新されます）
        }}
      />

      {/* 使い方モーダル */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* iOSインストールガイドモーダル */}
      {isInstallHelpOpen && (
        <div className="modal-overlay" onClick={() => setIsInstallHelpOpen(false)}>
          <div 
            className="modal-content glass-panel" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '380px' }}
          >
            <div className="modal-header">
              <h2 className="modal-title">ホーム画面に追加</h2>
              <button className="btn-icon" onClick={() => setIsInstallHelpOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.95rem', lineHeight: '1.5' }}>
              <p>iOS (Safari) ではブラウザの制限のため、画面上のボタンから直接追加することができません。以下の手順で簡単に追加できます。</p>
              <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)' }}>
                <li>ブラウザ下部（iPadは上部）にある<strong>「共有」ボタン</strong>（四角から上矢印が飛び出したアイコン）をタップします。</li>
                <li>メニューを下にスクロールし、<strong>「ホーム画面に追加」</strong>をタップします。</li>
                <li>右上の<strong>「追加」</strong>をタップすると、ホーム画面にアイコンが表示されます。</li>
              </ol>
              <button className="btn btn-primary" onClick={() => setIsInstallHelpOpen(false)}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
