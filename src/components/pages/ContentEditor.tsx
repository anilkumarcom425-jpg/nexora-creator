import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Save,
  Sparkles,
} from 'lucide-react';
import { Translations } from '../../i18n/translations';
import { generateWithAI } from '../../services/aiClient';
import { copyToClipboard, countWords, downloadTextFile } from '../../services/storage';
import { ContentLanguage, EditorDraft, ProjectCategory } from '../../types/nexora';
import { formatModuleError } from '../../utils/errorMessages';
import { ErrorAlert, ErrorBannerValue } from '../ErrorAlert';

interface ContentEditorProps {
  t: Translations;
  draft: EditorDraft;
  defaultLanguage: ContentLanguage;
  onChangeDraft: (next: EditorDraft) => void;
  onSaveProject: (title: string, category: ProjectCategory, content: string, projectId?: string) => string;
}

const CATEGORIES: ProjectCategory[] = [
  'blog',
  'shorts',
  'long-video',
  'social',
  'story',
  'prompts',
  'editor',
];

export const ContentEditor: React.FC<ContentEditorProps> = ({
  t,
  draft,
  defaultLanguage,
  onChangeDraft,
  onSaveProject,
}) => {
  const [aiInstruction, setAiInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorBannerValue>(null);
  const [copied, setCopied] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(draft.content);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleSave = () => {
    const title = draft.title.trim() || 'Untitled NEXORA Draft';
    const savedId = onSaveProject(title, draft.category, draft.content, draft.projectId);
    onChangeDraft({ ...draft, title, projectId: savedId });
    setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 1800);
  };

  const handleTransform = async (action: 'improve' | 'expand' | 'summarize' | 'regenerate') => {
    if (!draft.content.trim()) {
      setError(t.common.requiredField);
      return;
    }
    const uiLang = t.common.save === 'प्रोजेक्ट सेव करें' ? 'hi' : 'en';
    setError(null);
    setBusy(true);
    try {
      const res = await generateWithAI<{ text: string }>(
        'transform',
        {
          action,
          text: draft.content,
          language: defaultLanguage,
          instruction: aiInstruction,
        },
        { scope: 'text', moduleId: 'editor' }
      );
      onChangeDraft({ ...draft, content: res.text });
    } catch (err) {
      setError(formatModuleError(err, 'editor', uiLang, Boolean(draft.content.trim())));
    } finally {
      setBusy(false);
    }
  };

  const words = countWords(draft.content);
  const chars = draft.content.length;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">{t.editor.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.editor.subtitle}</p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
        {/* Title & Category */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.editor.docTitleLabel}
            </label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => onChangeDraft({ ...draft, title: e.target.value })}
              placeholder={t.editor.docTitlePlaceholder}
              className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
            />
          </div>
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.editor.categoryLabel}
            </label>
            <select
              value={draft.category}
              onChange={(e) =>
                onChangeDraft({ ...draft, category: e.target.value as ProjectCategory })
              }
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t.categories[cat]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* All Required Editor Actions */}
        <div className="flex flex-wrap items-center gap-2 py-3 border-y border-slate-200">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!draft.content}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? t.common.copied : t.common.copy}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTransform('regenerate')}
            disabled={busy || !draft.content}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
            <span>{t.common.regenerate}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTransform('improve')}
            disabled={busy || !draft.content}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.common.improve}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTransform('expand')}
            disabled={busy || !draft.content}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{t.common.expand}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTransform('summarize')}
            disabled={busy || !draft.content}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>{t.common.summarize}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!draft.content}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#0B1221] text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {savedFlag ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedFlag ? t.common.saved : t.common.save}</span>
          </button>

          <button
            type="button"
            onClick={() => downloadTextFile(draft.title || 'nexora_draft', draft.content)}
            disabled={!draft.content}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.common.downloadTxt}</span>
          </button>
        </div>

        {/* Optional AI Guidance */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            {t.editor.aiInstructionLabel}
          </label>
          <input
            type="text"
            value={aiInstruction}
            onChange={(e) => setAiInstruction(e.target.value)}
            placeholder={t.editor.aiInstructionPlaceholder}
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
          />
        </div>

        {/* Editable Canvas */}
        <div className="relative">
          {busy && (
            <div className="absolute inset-0 bg-white/75 backdrop-blur-xs z-10 flex items-center justify-center rounded-xl">
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B1221] text-white text-xs font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.common.generating}</span>
              </div>
            </div>
          )}
          <textarea
            rows={18}
            value={draft.content}
            onChange={(e) => onChangeDraft({ ...draft, content: e.target.value })}
            placeholder={t.editor.contentPlaceholder}
            className="w-full px-4 py-3.5 text-sm leading-relaxed rounded-xl border border-slate-200 focus:outline-none focus:border-blue-600 resize-y font-sans"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 tabular-nums">
          <span>
            {words} {t.common.words} · {chars} {t.common.characters}
          </span>
          <span>{t.common.localStorageBadge}</span>
        </div>
      </div>
    </div>
  );
};
