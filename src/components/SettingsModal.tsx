import React, { useRef, useState } from 'react';
import { X, Download, Upload, Trash2, ShieldAlert } from 'lucide-react';
import { db } from '../db';
import type { Task, Record as DbRecord } from '../db';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataImported: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onDataImported,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  // JSONデータエクスポート
  const handleExport = async () => {
    try {
      const tasks = await db.tasks.toArray();
      const records = await db.records.toArray();

      const backupData = {
        version: 1,
        exportedAt: Date.now(),
        tasks,
        records,
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `lastdone_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('データのエクスポートに失敗しました。');
      console.error(err);
    }
  };

  // JSONデータインポート
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const result = event.target?.result as string;
        const backupData = JSON.parse(result);

        // バリデーション
        if (!backupData || !Array.isArray(backupData.tasks) || !Array.isArray(backupData.records)) {
          throw new Error('インポートファイルの形式が正しくありません。');
        }

        const confirmed = window.confirm(
          `タスク ${backupData.tasks.length}件、履歴 ${backupData.records.length}件をインポートします。\n既存のデータはマージ（統合）されます。よろしいですか？`
        );

        if (!confirmed) {
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        // DBにデータをインポート（ID衝突時は上書き）
        await db.transaction('rw', [db.tasks, db.records], async () => {
          for (const task of backupData.tasks as Task[]) {
            await db.tasks.put(task);
          }
          for (const record of backupData.records as DbRecord[]) {
            await db.records.put(record);
          }
        });

        setImportStatus('success');
        onDataImported();
        setTimeout(() => setImportStatus('idle'), 3000);
      } catch (err: any) {
        setImportStatus('error');
        setErrorMessage(err.message || 'ファイルの読み込み中にエラーが発生しました。');
        setTimeout(() => setImportStatus('idle'), 5000);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // データベース全初期化
  const handleClearAllData = async () => {
    const confirmed1 = window.confirm(
      '【警告】本当にすべてのデータを削除しますか？\nこの操作は取り消せません。'
    );
    if (!confirmed1) return;

    const confirmed2 = window.confirm(
      '最終確認：すべてのタスクと実行履歴が完全に消去されます。本当によろしいですか？'
    );
    if (!confirmed2) return;

    try {
      await db.transaction('rw', [db.tasks, db.records], async () => {
        await db.tasks.clear();
        await db.records.clear();
      });
      alert('すべてのデータを削除しました。');
      onDataImported(); // 親コンポーネントの状態をリフレッシュ
      onClose();
    } catch (err) {
      alert('データの削除に失敗しました。');
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content glass-panel" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '420px' }}
      >
        <div className="modal-header">
          <h2 className="modal-title">アプリ設定・バックアップ</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* データバックアップ */}
          <div className="settings-section">
            <span className="settings-section-title">データを保存（エクスポート）</span>
            <p className="settings-section-desc">
              現在のすべてのタスクと履歴データをJSON形式ファイルとして保存します。機種変更時のデータ移行や定期的なバックアップにご利用ください。
            </p>
            <button className="btn btn-secondary" onClick={handleExport} style={{ marginTop: '6px' }}>
              <Download size={16} /> JSONエクスポート
            </button>
          </div>

          {/* データ復元 */}
          <div className="settings-section">
            <span className="settings-section-title">データを復元（インポート）</span>
            <p className="settings-section-desc">
              保存したJSONバックアップファイルを読み込み、データを復元します。既存データとIDが重複するものは自動的に更新され、新しいデータは追加されます。
            </p>
            
            <div className="file-input-wrapper" style={{ marginTop: '6px' }}>
              <button className="btn btn-secondary" style={{ width: '100%' }}>
                <Upload size={16} /> JSONインポート
              </button>
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleImport}
              />
            </div>

            {importStatus === 'success' && (
              <p style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, marginTop: '4px' }}>
                ✓ データのインポートに成功しました！
              </p>
            )}
            {importStatus === 'error' && (
              <p style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600, marginTop: '4px' }}>
                ⚠ エラー: {errorMessage}
              </p>
            )}
          </div>

          {/* データ消去 */}
          <div className="settings-section" style={{ borderColor: 'rgba(239, 68, 68, 0.15)' }}>
            <span className="settings-section-title" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={16} /> 危険な操作
            </span>
            <p className="settings-section-desc">
              アプリ内のデータベースに保存されているすべてのデータを完全に消去します。この操作を実行する前に、バックアップを取ることをお勧めします。
            </p>
            <button 
              className="btn btn-danger" 
              onClick={handleClearAllData} 
              style={{ marginTop: '6px' }}
            >
              <Trash2 size={16} /> 全データを削除
            </button>
          </div>

          {/* バージョン情報 */}
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '8px' }}>
            <span>これいつ App v1.0.0</span>
            <br />
            <span>完全ローカル保存型PWA (維持費無料)</span>
          </div>

        </div>
      </div>
    </div>
  );
};
