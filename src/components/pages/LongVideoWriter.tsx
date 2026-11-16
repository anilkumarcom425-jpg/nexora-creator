import React, { useState } from 'react';
import { Film, Loader2 } from 'lucide-react';
import { Translations } from '../../i18n/translations';
import { formatLongVideoAsText, generateWithAI } from '../../services/aiClient';
import { ContentLanguage, EditorDraft, LongVideoResult, ProjectCategory } from '../../types/nexora';
import { validateLongVideoCustomDuration } from '../../utils/lengthValidation';
import { formatModuleError } from '../../utils/errorMessages';
import { ActionToolbar } from '../ActionToolbar';
import { ErrorAlert, ErrorBannerValue } from '../ErrorAlert';

interface LongVideoWriterProps {
  t: Translations;
  defaultLanguage: ContentLanguage;
  onSaveProject: (title: string, category: ProjectCategory, content: string) => void;
  onOpenInEditor: (draft: EditorDraft) => void;
}

const DURATIONS = ['5 minutes', '10 minutes', '15 minutes', '20 minutes'];
const FORMATS = ['Educational', 'Informative', 'Documentary', 'Storytelling', 'Entertainment', 'Tutorial', 'Case Study'];
const DELIVERIES = ['Host Narration', 'Multi-Character Dialogue', 'Host + Voiceover'];
const TONES = ['Informative & Engaging', 'Authoritative', 'Conversational', 'Cinematic & Dramatic', 'Lighthearted'];

export const LongVideoWriter: React.FC<LongVideoWriterProps> = ({
  t,
  defaultLanguage,
  onSaveProject,
  onOpenInEditor,
}) => {
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('10 minutes');
  const [customMinutes, setCustomMinutes] = useState('');
  const [format, setFormat] = useState('Educational');
  const [language, setLanguage] = useState<ContentLanguage>(defaultLanguage);
  const [deliveryMode, setDeliveryMode] = useState('Host Narration');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('Informative & Engaging');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorBannerValue>(null);
  const [result, setResult] = useState<LongVideoResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const isCustomDuration = duration === 'custom';

  const buildPayload = () => ({
    topic,
    duration: isCustomDuration ? `${customMinutes.trim()} minutes` : duration,
    lengthMode: isCustomDuration ? 'custom' : 'preset',
    customDurationMinutes: isCustomDuration ? customMinutes.trim() : '',
    format,
    language,
    deliveryMode,
    audience,
    tone,
  });

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim()) {
      setError(t.common.requiredField);
      return;
    }
    const uiLang = t.common.save === 'प्रोजेक्ट सेव करें' ? 'hi' : 'en';
    if (isCustomDuration) {
      const check = validateLongVideoCustomDuration(customMinutes, uiLang);
      if (!check.valid) {
        setError(check.error || t.common.requiredField);
        return;
      }
    }
    setError(null);
    setLoading(true);
    try {
      const data = await generateWithAI<LongVideoResult>('long_video', buildPayload(), {
        scope: 'text',
        moduleId: 'long_video',
      });
      setResult(data);
      setIsEditing(false);
    } catch (err) {
      setError(formatModuleError(err, 'long_video', uiLang, Boolean(result)));
    } finally {
      setLoading(false);
    }
  };

  const plainText = result ? formatLongVideoAsText(result) : '';

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">{t.longVideo.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.longVideo.subtitle}</p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleGenerate}
          className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.longVideo.topicLabel} *
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t.longVideo.topicPlaceholder}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.longVideo.durationLabel}
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
                {t.longVideo.formatLabel}
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600"
              >
                {FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isCustomDuration && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                {t.longVideo.customDurationLabel} *
              </label>
              <input
                type="number"
                min={1}
                max={240}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                placeholder={t.longVideo.customDurationPlaceholder}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-blue-300 bg-blue-50/30 focus:outline-none focus:border-blue-600 tabular-nums"
              />
              <p className="text-xs text-slate-500 leading-snug">
                {t.longVideo.longDurationNotice}
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.longVideo.deliveryLabel}
            </label>
            <select
              value={deliveryMode}
              onChange={(e) => setDeliveryMode(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600"
            >
              {DELIVERIES.map((dl) => (
                <option key={dl} value={dl}>
                  {dl}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.longVideo.languageLabel}
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
                {t.longVideo.toneLabel}
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
              {t.longVideo.audienceLabel}
            </label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder={t.longVideo.audiencePlaceholder}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#0B1221] text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
            <span>{loading ? t.common.generating : t.common.generate}</span>
          </button>
        </form>

        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          {!result && !loading ? (
            <div className="py-16 text-center">
              <Film className="w-9 h-9 text-slate-300 mx-auto mb-3" />
              <div className="text-base font-semibold text-slate-900">{t.longVideo.title}</div>
              <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">{t.longVideo.subtitle}</p>
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
                title={result.videoTitle || topic}
                plainText={plainText}
                isEditing={isEditing}
                onToggleEdit={() => setIsEditing((v) => !v)}
                onRegenerate={() => handleGenerate()}
                onSaveProject={() => onSaveProject(result.videoTitle || topic, 'long-video', plainText)}
                onOpenInEditor={() =>
                  onOpenInEditor({
                    title: result.videoTitle || topic,
                    category: 'long-video',
                    content: plainText,
                    regenerateContext: { mode: 'long_video', payload: buildPayload() },
                  })
                }
                busy={loading}
              />

              <div className="space-y-5">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="text-xs font-semibold text-slate-500">
                      {t.longVideo.videoTitleHeading}
                    </div>
                    {result.targetLengthLabel && (
                      <div className="text-xs text-slate-500 tabular-nums">
                        {t.common.activeTarget} {result.targetLengthLabel}
                        {result.totalParts && result.totalParts > 1
                          ? ` · ${result.totalParts} ${t.common.partLabel}`
                          : ''}
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={result.videoTitle}
                      onChange={(e) => setResult({ ...result, videoTitle: e.target.value })}
                      className="w-full px-3 py-2 text-lg font-bold rounded-lg border border-slate-300"
                    />
                  ) : (
                    <h3 className="text-xl font-bold text-slate-900">{result.videoTitle}</h3>
                  )}
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-xs font-semibold text-slate-500">{t.longVideo.hookHeading}</div>
                  {isEditing ? (
                    <textarea
                      rows={3}
                      value={result.openingHook}
                      onChange={(e) => setResult({ ...result, openingHook: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                    />
                  ) : (
                    <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-line">
                      {result.openingHook}
                    </p>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">{t.longVideo.introHeading}</h4>
                  {isEditing ? (
                    <textarea
                      rows={3}
                      value={result.introduction}
                      onChange={(e) => setResult({ ...result, introduction: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                    />
                  ) : (
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {result.introduction}
                    </p>
                  )}
                </div>

                <div className="space-y-4 pt-3 border-t border-slate-200">
                  <h4 className="text-sm font-bold text-slate-900">{t.longVideo.sectionsHeading}</h4>
                  {result.sections.map((sec, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={sec.sectionTitle}
                            onChange={(e) => {
                              const next = [...result.sections];
                              next[idx] = { ...next[idx], sectionTitle: e.target.value };
                              setResult({ ...result, sections: next });
                            }}
                            className="flex-1 px-2.5 py-1.5 text-sm font-bold rounded-lg border border-slate-300"
                          />
                        ) : (
                          <div className="text-base font-bold text-slate-900">{sec.sectionTitle}</div>
                        )}
                        <span className="text-xs font-mono font-medium text-slate-500 tabular-nums shrink-0">
                          {sec.partNumber ? `${t.common.partLabel} ${sec.partNumber} · ` : ''}
                          {sec.timestamp}
                        </span>
                      </div>

                      {isEditing ? (
                        <textarea
                          rows={5}
                          value={sec.scriptContent}
                          onChange={(e) => {
                            const next = [...result.sections];
                            next[idx] = { ...next[idx], scriptContent: e.target.value };
                            setResult({ ...result, sections: next });
                          }}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                        />
                      ) : (
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                          {sec.scriptContent}
                        </p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="font-semibold text-slate-800">
                            {t.longVideo.sceneSuggestionLabel}:{' '}
                          </span>
                          {sec.sceneSuggestion}
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                          <span className="font-semibold text-slate-800">
                            {t.longVideo.transitionLabel}:{' '}
                          </span>
                          {sec.transition}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">
                      {t.longVideo.conclusionHeading}
                    </div>
                    <p className="text-sm text-slate-800 leading-relaxed">{result.conclusion}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                    <div className="text-xs font-semibold text-slate-500 mb-1">
                      {t.longVideo.ctaHeading}
                    </div>
                    <p className="text-sm font-medium text-slate-900">{result.viewerCta}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
