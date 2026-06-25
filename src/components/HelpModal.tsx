import React from 'react';
import { X, HelpCircle, Check, Clock, Calendar, ArrowRight, ArrowDown } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content glass-panel" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={22} color="var(--accent)" />
            <h2 className="modal-title">イツヤッタの使い方</h2>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '0.9rem', lineHeight: '1.6' }}>
          {/* 基本操作 */}
          <div className="settings-section">
            <h3 className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)' }}>
              <Check size={18} /> 完了の記録（スワイプ）
            </h3>
            <p className="settings-section-desc">
              タスクカードを<strong>右にスワイプ</strong>し、しきい値を超えると「完了！」と表示され、実行日時が記録されます。<br />
              モバイル端末では、しきい値に達した際に心地よいバイブレーションが動作します。
            </p>
          </div>

          {/* 目標サイクル */}
          <div className="settings-section">
            <h3 className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444' }}>
              <Clock size={18} /> 目標サイクルと警告
            </h3>
            <p className="settings-section-desc">
              タスクを作成・編集する際に「目標サイクル (日数)」を設定できます。<br />
              前回の実行から設定した日数が経過すると、カードの前回実行時間が<strong>赤色の太字で「(期限切れ)」</strong>と強調表示されます。
            </p>
          </div>

          {/* 並べ替えと絞り込み */}
          <div className="settings-section">
            <h3 className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)' }}>
              <ArrowRight size={18} /> 並べ替えと絞り込み
            </h3>
            <p className="settings-section-desc">
              上部のタグチップで「期限切れ」を選択すると、現在警告が出ているタスクのみに絞り込めます。<br />
              また、「期限超過/猶予順」や「前回実行 (古い順)」で並び替えることで、放置されているタスクを優先的に確認できます。
            </p>
          </div>

          {/* カレンダー画面 */}
          <div className="settings-section">
            <h3 className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
              <Calendar size={18} /> カレンダー画面
            </h3>
            <p className="settings-section-desc">
              上部のタブで「カレンダー」に切り替えると、月間でいつどのタスクを実行したかがカラーインジケータ（ドット）で一目で分かります。<br />
              日付セルをタップすると、その日の詳細リストが表示され、履歴の個別削除も行えます。カレンダー上部でもタグ絞り込みが可能です。
            </p>
          </div>

          {/* 履歴の編集 */}
          <div className="settings-section">
            <h3 className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
              <ArrowDown size={18} /> 履歴の個別修正・過去限定編集
            </h3>
            <p className="settings-section-desc">
              タスクカードの履歴ボタン（またはタスク名）から履歴モーダルを開くと、<strong>直近3回分</strong>の履歴が確認できます。<br />
              各履歴の編集ボタンから日時を変更できますが、未来の日付には変更できないよう<strong>過去のみに制限</strong>されています。
            </p>
          </div>

          <button className="btn btn-primary" onClick={onClose} style={{ marginTop: '8px' }}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
