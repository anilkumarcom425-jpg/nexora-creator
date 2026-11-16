import React, { useState } from 'react';
import { Check, Clapperboard, Copy, Loader2 } from 'lucide-react';
import { Translations } from '../../i18n/translations';
import { formatShortsAsText, generateWithAI } from '../../services/aiClient';
import { copyToClipboard } from '../../services/storage';
import { ContentLanguage, EditorDraft, ProjectCategory, ShortsResult } from '../../types/nexora';
import { DurationUnit, validateShortsCustomDuration } from '../../utils/lengthValidation';
import { formatModuleError } from '../../utils/errorMessages';
import { ActionToolbar } from '../ActionToolbar';
import { ErrorAlert, ErrorBannerValue } from '../ErrorAlert';

interface ShortsWriterProps {
  t: Translations;
  defaultLanguage: ContentLanguage;
  onSaveProject: (title: string, category: ProjectCategory, content: string) => void;
  onOpenInEditor: (draft: EditorDraft) => void;
}

const DURATIONS = ['15 seconds', '25 seconds', '30 seconds', '45 seconds', '60 seconds'];
const CATEGORIES = ['Facts', 'Education', 'Tech', 'Motivation', 'Comedy', 'Story', 'Business', 'Lifestyle'];
const TONES = ['Energetic', 'Informative', 'Dramatic', 'Funny', 'Emotional', 'Suspenseful'];

export const ShortsWriter: React.FC<ShortsWriterProps> = ({
  t,
  defaultLanguage,
  onSaveProject,
  onOpenInEditor,
}) => {
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('30 seconds');
  const [customDurationAmount, setCustomDurationAmount] = useState('');
  const [customDurationUnit, setCustomDurationUnit] = useState<DurationUnit>('seconds');
  const [category, setCategory] = useState('Education');
  const [language, setLanguage] = useState<ContentLanguage>(defaultLanguage);
  const [tone, setTone] = useState('Energetic');
  const [characters, setCharacters] = useState('Aarav, Priya');
  const [sceneCount, setSceneCount] = useState(4);
  const [includeNarrator, setIncludeNarrator] = useState(false);
  const [includeLikeSubscribe, setIncludeLikeSubscribe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorBannerValue>(null);
  const [result, setResult] = useState<ShortsResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedPromptKey, setCopiedPromptKey] = useState<string | null>(null);

  const isCustomDuration = duration === 'custom';

  const getCustomDurationString = () => {
    const n = Number(customDurationAmount);
    const unitWord = customDurationUnit === 'minutes' ? (n === 1 ? 'minute' : 'minutes') : n === 1 ? 'second' : 'seconds';
    return `${customDurationAmount.trim()} ${unitWord}`;
  };

  const buildPayload = () => ({
    topic,
    duration: isCustomDuration ? getCustomDurationString() : duration,
    lengthMode: isCustomDuration ? 'custom' : 'preset',
    customDuration: isCustomDuration ? getCustomDurationString() : '',
    category,
    language,
    tone,
    characters,
    sceneCount,
    includeNarrator,
    includeLikeSubscribe,
  });

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim()) {
      setError(t.common.requiredField);
      return;
    }
    const uiLang = t.common.save === 'प्रोजेक्ट सेव करें' ? 'hi' : 'en';
    if (isCustomDuration) {
      const check = validateShortsCustomDuration(customDurationAmount, customDurationUnit, uiLang);
      if (!check.valid) {
        setError(check.error || t.common.requiredField);
        return;
      }
    }
    setError(null);
    setLoading(true);
    try {
      const data = await generateWithAI<ShortsResult>('shorts', buildPayload(), {
        scope: 'text',
        moduleId: 'shorts',
      });
      setResult(data);
      setIsEditing(false);
    } catch (err) {
      setError(formatModuleError(err, 'shorts', uiLang, Boolean(result)));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = async (key: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedPromptKey(key);
      setTimeout(() => setCopiedPromptKey(null), 1500);
    }
  };

  const plainText = result ? formatShortsAsText(result) : '';

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-2">
        <h2 className="text-lg font-bold text-slate-900">{t.shorts.title}</h2>
        <p className="text-sm text-slate-600">{t.shorts.subtitle}</p>
        <p className="text-xs text-slate-500 pt-1">{t.shorts.rulesNote}</p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleGenerate}
          className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.shorts.topicLabel} *
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t.shorts.topicPlaceholder}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.shorts.durationLabel}
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600 tabular-nums"
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
                <option value="custom">{t.common.customOption}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.shorts.sceneCountLabel}
              </label>
              <select
                value={sceneCount}
                onChange={(e) => setSceneCount(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600 tabular-nums"
              >
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isCustomDuration && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.shorts.customDurationLabel} *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  max={1800}
                  value={customDurationAmount}
                  onChange={(e) => setCustomDurationAmount(e.target.value)}
                  placeholder={t.shorts.customDurationPlaceholder}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-blue-300 bg-blue-50/30 focus:outline-none focus:border-blue-600 tabular-nums"
                />
                <select
                  value={customDurationUnit}
                  onChange={(e) => setCustomDurationUnit(e.target.value as DurationUnit)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-blue-300 bg-blue-50/30 focus:outline-none focus:border-blue-600"
                >
                  <option value="seconds">{t.common.seconds}</option>
                  <option value="minutes">{t.common.minutes}</option>
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.shorts.categoryLabel}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.shorts.toneLabel}
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600"
              >
                {TONES.map((tn) => (
                  <option key={tn} value={tn}>
                    {tn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.shorts.languageLabel}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as ContentLanguage)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600"
            >
              <option value="Hindi">हिंदी (Hindi)</option>
              <option value="English">English</option>
              <option value="Hinglish">Hinglish</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.shorts.charactersLabel}
            </label>
            <input
              type="text"
              value={characters}
              onChange={(e) => setCharacters(e.target.value)}
              placeholder={t.shorts.charactersPlaceholder}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="space-y-2.5 pt-1">
            <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeNarrator}
                onChange={(e) => setIncludeNarrator(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span>{t.shorts.includeNarrator}</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeLikeSubscribe}
                onChange={(e) => setIncludeLikeSubscribe(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span>{t.shorts.includeLikeSubscribe}</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#0B1221] text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clapperboard className="w-4 h-4" />}
            <span>{loading ? t.common.generating : t.common.generate}</span>
          </button>
        </form>

        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          {!result && !loading ? (
            <div className="py-16 text-center">
              <Clapperboard className="w-9 h-9 text-slate-300 mx-auto mb-3" />
              <div className="text-base font-semibold text-slate-900">{t.shorts.title}</div>
              <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">{t.shorts.subtitle}</p>
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
                title={result.title || topic}
                plainText={plainText}
                isEditing={isEditing}
                onToggleEdit={() => setIsEditing((v) => !v)}
                onRegenerate={() => handleGenerate()}
                onSaveProject={() => onSaveProject(result.title || topic, 'shorts', plainText)}
                onOpenInEditor={() =>
                  onOpenInEditor({
                    title: result.title || topic,
                    category: 'shorts',
                    content: plainText,
                    regenerateContext: { mode: 'shorts', payload: buildPayload() },
                  })
                }
                busy={loading}
              />

              <div className="space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{result.title}</h3>
                  {result.targetLengthLabel && (
                    <span className="text-xs text-slate-500 tabular-nums">
                      {t.common.activeTarget} {result.targetLengthLabel}
                      {result.totalParts && result.totalParts > 1
                        ? ` · ${result.totalParts} ${t.common.partLabel}`
                        : ''}
                    </span>
                  )}
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs font-semibold text-slate-500 mb-1">{t.shorts.hookHeading}</div>
                  {isEditing ? (
                    <textarea
                      rows={2}
                      value={result.hook}
                      onChange={(e) => setResult({ ...result, hook: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-900">{result.hook}</p>
                  )}
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    {t.shorts.appearanceGuideHeading}
                  </div>
                  {isEditing ? (
                    <textarea
                      rows={2}
                      value={result.characterAppearanceGuide}
                      onChange={(e) =>
                        setResult({ ...result, characterAppearanceGuide: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                    />
                  ) : (
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {result.characterAppearanceGuide}
                    </p>
                  )}
                </div>

                {/* Scene-by-scene Breakdown */}
                <div className="space-y-4">
                  {result.scenes.map((scene, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 bg-white space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500 tabular-nums">
                        <span>
                          {scene.partNumber ? `${t.common.partLabel} ${scene.partNumber} · ` : ''}
                          {t.shorts.sceneLabel} {scene.sceneNumber} · {scene.durationEstimate}
                        </span>
                        <span className="text-[#0B1221]">
                          {t.shorts.speakerLabel}: {scene.speakingCharacter}
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-slate-500 mb-1">
                          {t.shorts.dialogueLabel}
                        </div>
                        {isEditing ? (
                          <textarea
                            rows={2}
                            value={scene.dialogue}
                            onChange={(e) => {
                              const next = [...result.scenes];
                              next[idx] = { ...next[idx], dialogue: e.target.value };
                              setResult({ ...result, scenes: next });
                            }}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                          />
                        ) : (
                          <p className="text-sm font-medium text-slate-900">“{scene.dialogue}”</p>
                        )}
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-slate-500 mb-1">
                          {t.shorts.visualLabel}
                        </div>
                        {isEditing ? (
                          <textarea
                            rows={2}
                            value={scene.visualDescription}
                            onChange={(e) => {
                              const next = [...result.scenes];
                              next[idx] = { ...next[idx], visualDescription: e.target.value };
                              setResult({ ...result, scenes: next });
                            }}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                          />
                        ) : (
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {scene.visualDescription}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-semibold text-slate-600">
                              {t.shorts.imagePromptLabel}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyPrompt(`img-${idx}`, scene.aiImagePrompt)}
                              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              {copiedPromptKey === `img-${idx}` ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedPromptKey === `img-${idx}` ? t.common.copied : t.common.copy}</span>
                            </button>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed font-mono">
                            {scene.aiImagePrompt}
                          </p>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-semibold text-slate-600">
                              {t.shorts.videoPromptLabel}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyPrompt(`vid-${idx}`, scene.aiVideoPrompt)}
                              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              {copiedPromptKey === `vid-${idx}` ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedPromptKey === `vid-${idx}` ? t.common.copied : t.common.copy}</span>
                            </button>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed font-mono">
                            {scene.aiVideoPrompt}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ending & CTA */}
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-xs font-semibold text-slate-500">{t.shorts.endingHeading}</div>
                  <p className="text-sm text-slate-800">{result.ending}</p>
                  {includeLikeSubscribe && result.likeSubscribeLine && (
                    <div className="pt-2 border-t border-slate-200">
                      <div className="text-xs font-semibold text-slate-500 mb-0.5">
                        {t.shorts.ctaHeading}
                      </div>
                      <p className="text-sm font-medium text-slate-900">{result.likeSubscribeLine}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
