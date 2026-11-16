import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Edit3,
  FileEdit,
  Maximize2,
  Minimize2,
  RefreshCw,
  Save,
  Sparkles,
} from 'lucide-react';
import { Translations } from '../i18n/translations';
import { copyToClipboard, downloadTextFile } from '../services/storage';

interface ActionToolbarProps {
  t: Translations;
  title: string;
  plainText: string;
  isEditing?: boolean;
  onToggleEdit?: () => void;
  onRegenerate?: () => void;
  onTransform?: (action: 'improve' | 'expand' | 'summarize') => void;
  onSaveProject: () => void;
  onOpenInEditor: () => void;
  busy?: boolean;
}

export const ActionToolbar: React.FC<ActionToolbarProps> = ({
  t,
  title,
  plainText,
  isEditing,
  onToggleEdit,
  onRegenerate,
  onTransform,
  onSaveProject,
  onOpenInEditor,
  busy = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(plainText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleSave = () => {
    onSaveProject();
    setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 1800);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-200">
      <button
        type="button"
        onClick={handleCopy}
        disabled={busy || !plainText}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0 transition-colors"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        <span>{copied ? t.common.copied : t.common.copy}</span>
      </button>

      {onToggleEdit && (
        <button
          type="button"
          onClick={onToggleEdit}
          disabled={busy}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border whitespace-nowrap shrink-0 transition-colors ${
            isEditing
              ? 'bg-[#0B1221] text-white border-[#0B1221]'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{isEditing ? t.common.doneEditing : t.common.edit}</span>
        </button>
      )}

      {onRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
          <span>{t.common.regenerate}</span>
        </button>
      )}

      {onTransform && (
        <>
          <button
            type="button"
            onClick={() => onTransform('improve')}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.common.improve}</span>
          </button>
          <button
            type="button"
            onClick={() => onTransform('expand')}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{t.common.expand}</span>
          </button>
          <button
            type="button"
            onClick={() => onTransform('summarize')}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0 transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>{t.common.summarize}</span>
          </button>
        </>
      )}

      <button
        type="button"
        onClick={onOpenInEditor}
        disabled={busy || !plainText}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0 transition-colors"
      >
        <FileEdit className="w-3.5 h-3.5" />
        <span>{t.common.openInEditor}</span>
      </button>

      <button
        type="button"
        onClick={handleSave}
        disabled={busy || !plainText}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#0B1221] text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0 transition-colors"
      >
        {savedFlag ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
        <span>{savedFlag ? t.common.saved : t.common.save}</span>
      </button>

      <button
        type="button"
        onClick={() => downloadTextFile(title || 'nexora_output', plainText)}
        disabled={busy || !plainText}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0 transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{t.common.downloadTxt}</span>
      </button>
    </div>
  );
};
