import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Settings, Sparkles, Filter, Download, X, Sun, Moon } from 'lucide-react';
import { db, generateUUID } from './db';
import type { Task, Record as DbRecord } from './db';
import { SwipeableTaskCard } from './components/SwipeableTaskCard';
import { TaskFormModal } from './components/TaskFormModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { SettingsModal } from './components/SettingsModal';
export default function App() {
  // モーダル表示状態
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
    return ['すべて', ...Array.from(tagsSet)];
  }, [tasks]);

  // 表示するタスクのフィルタリング
  const filteredTasks = useMemo(() => {
    if (selectedTag === 'すべて') return tasks;
    return tasks.filter((task) => task.tags.includes(selectedTag));
  }, [tasks, selectedTag]);

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
  const handleFormSubmit = async (data: { name: string; color: string; tags: string[] }) => {
    if (editingTask) {
      // 編集
      await db.tasks.update(editingTask.id, {
        name: data.name,
        color: data.color,
        tags: data.tags,
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
            <Sparkles size={20} color="#ffffff" />
          </div>
          <h1>これいつ</h1>
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
            onClick={() => setIsSettingsOpen(true)}
            title="設定・バックアップ"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* メインレイアウト */}
      <main className="main-container">
        
        {/* タグによる絞り込みチップ */}
        {allTags.length > 1 && (
          <div className="tag-filter-container">
            {allTags.map((tag) => (
              <button
                key={tag}
                className={`tag-chip ${selectedTag === tag ? 'active' : ''}`}
                onClick={() => setSelectedTag(tag)}
              >
                {tag === 'すべて' ? tag : `#${tag}`}
              </button>
            ))}
          </div>
        )}

        {/* タスク一覧 */}
        <section className="task-list">
          {filteredTasks.length === 0 ? (
            <div className="empty-state">
              <Filter size={32} className="empty-state-icon" />
              <h3>タスクが見つかりません</h3>
              <p>
                {selectedTag !== 'すべて' 
                  ? `タグ「#${selectedTag}」の登録タスクはありません。` 
                  : '右下の「＋」ボタンから最初のタスクを作成しましょう！'}
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => (
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
      </main>

      {/* フローティングアクションボタン(FAB) */}
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
