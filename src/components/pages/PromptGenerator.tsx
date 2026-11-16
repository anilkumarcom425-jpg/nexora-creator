import React, { useState } from 'react';
import { Check, Copy, Loader2, Wand2 } from 'lucide-react';
import { Translations } from '../../i18n/translations';
import { formatPromptAsText, generateWithAI } from '../../services/aiClient';
import { copyToClipboard } from '../../services/storage';
import { EditorDraft, ProjectCategory, PromptResult } from '../../types/nexora';
import { formatModuleError } from '../../utils/errorMessages';
import { ActionToolbar } from '../ActionToolbar';
import { ErrorAlert, ErrorBannerValue } from '../ErrorAlert';

interface PromptGeneratorProps {
  t: Translations;
  onSaveProject: (title: string, category: ProjectCategory, content: string) => void;
  onOpenInEditor: (draft: EditorDraft) => void;
}

const PROMPT_CATEGORIES = [
  'Image generation prompts',
  'Video generation prompts',
  'Cartoon prompts',
  'Realistic scene prompts',
  'Character prompts',
  'Business and marketing prompts',
  'General AI prompts',
];

const ASPECT_RATIOS = ['Default / Auto', '16:9 (Widescreen)', '9:16 (Vertical / Shorts)', '1:1 (Square)', '4:3 (Standard)'];

export const PromptGenerator: React.FC<PromptGeneratorProps> = ({
  t,
  onSaveProject,
  onOpenInEditor,
}) => {
  const [idea, setIdea] = useState('');
  const [category, setCategory] = useState(PROMPT_CATEGORIES[0]);
  const [style, setStyle] = useState('');
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0]);
  const [outputLanguage, setOutputLanguage] = useState('English');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorBannerValue>(null);
  const [result, setResult] = useState<PromptResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const buildPayload = () => ({
    idea,
    category,
    style,
    aspectRatio,
    outputLanguage,
  });

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!idea.trim()) {
      setError(t.common.requiredField);
      return;
    }
    const uiLang = t.common.save === 'प्रोजेक्ट सेव करें' ? 'hi' : 'en';
    setError(null);
    setLoading(true);
    try {
      const data = await generateWithAI<PromptResult>('prompt', buildPayload(), {
        scope: 'text',
        moduleId: 'prompts',
      });
      setResult(data);
      setIsEditing(false);
    } catch (err) {
      setError(formatModuleError(err, 'prompts', uiLang, Boolean(result)));
    } finally {
      setLoading(false);
    }
  };

  const copyBlock = async (id: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const plainText = result ? formatPromptAsText(result) : '';

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">{t.prompts.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.prompts.subtitle}</p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleGenerate}
          className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.prompts.ideaLabel} *
            </label>
            <textarea
              rows={3}
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder={t.prompts.ideaPlaceholder}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.prompts.categoryLabel}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600"
            >
              {PROMPT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.prompts.styleLabel}
            </label>
            <input
              type="text"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder={t.prompts.stylePlaceholder}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.prompts.aspectLabel}
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600"
              >
                {ASPECT_RATIOS.map((ar) => (
                  <option key={ar} value={ar}>
                    {ar}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.prompts.outputLangLabel}
              </label>
              <select
                value={outputLanguage}
                onChange={(e) => setOutputLanguage(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600"
              >
                <option value="English">English</option>
                <option value="Hindi">हिंदी (Hindi)</option>
                <option value="Bilingual (English + Hindi)">Bilingual</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#0B1221] text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            <span>{loading ? t.common.generating : t.common.generate}</span>
          </button>
        </form>

        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          {!result && !loading ? (
            <div className="py-16 text-center">
              <Wand2 className="w-9 h-9 text-slate-300 mx-auto mb-3" />
              <div className="text-base font-semibold text-slate-900">{t.prompts.title}</div>
              <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">{t.prompts.subtitle}</p>
            </div>
          ) : !result && loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#0B1221] mx-auto" />
              <div className="text-sm font-medium text-slate-600">{t.common.generating}</div>
            </div>
          ) : result ? (
            <div className="space-y-6">
              {loading && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs font-medium text-blue-900">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-700 shrink-0" />
                  <span>{t.common.preservingContentWhileRetrying}</span>
                </div>
              )}
              <ActionToolbar
                t={t}
                title={result.title || idea}
                plainText={plainText}
                isEditing={isEditing}
                onToggleEdit={() => setIsEditing((v) => !v)}
                onRegenerate={() => handleGenerate()}
                onSaveProject={() => onSaveProject(result.title || idea, 'prompts', plainText)}
                onOpenInEditor={() =>
                  onOpenInEditor({
                    title: result.title || idea,
                    category: 'prompts',
                    content: plainText,
                    regenerateContext: { mode: 'prompt', payload: buildPayload() },
                  })
                }
                busy={loading}
              />

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">{result.title}</h3>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      {t.prompts.mainPromptHeading}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyBlock('main', result.mainPrompt)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                    >
                      {copiedId === 'main' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === 'main' ? t.common.copied : t.common.copy}</span>
                    </button>
                  </div>
                  {isEditing ? (
                    <textarea
                      rows={5}
                      value={result.mainPrompt}
                      onChange={(e) => setResult({ ...result, mainPrompt: e.target.value })}
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 bg-white"
                    />
                  ) : (
                    <p className="text-sm font-mono text-slate-900 leading-relaxed whitespace-pre-line">
                      {result.mainPrompt}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="text-xs font-semibold text-slate-500">
                      {t.prompts.techNotesHeading}
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {result.technicalAndLightingNotes}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="text-xs font-semibold text-slate-500">
                      {t.prompts.avoidHeading}
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {result.negativeOrAvoid}
                    </p>
                  </div>
                </div>

                {result.variations?.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-200">
                    <div className="text-xs font-semibold text-slate-500">
                      {t.prompts.variationsHeading}
                    </div>
                    {result.variations.map((v, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-3"
                      >
                        <p className="text-xs font-mono text-slate-800 leading-relaxed">{v}</p>
                        <button
                          type="button"
                          onClick={() => copyBlock(`var-${i}`, v)}
                          className="text-xs font-semibold text-blue-600 hover:underline shrink-0"
                        >
                          {copiedId === `var-${i}` ? t.common.copied : t.common.copy}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
