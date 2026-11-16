import React, { useState } from 'react';
import { Check, Copy, Loader2, Share2 } from 'lucide-react';
import { Translations } from '../../i18n/translations';
import { formatSocialAsText, generateWithAI } from '../../services/aiClient';
import { copyToClipboard, countWords } from '../../services/storage';
import { ContentLanguage, EditorDraft, ProjectCategory, SocialResult } from '../../types/nexora';
import { SocialLengthUnit, validateSocialCustomLength } from '../../utils/lengthValidation';
import { formatModuleError } from '../../utils/errorMessages';
import { ActionToolbar } from '../ActionToolbar';
import { ErrorAlert, ErrorBannerValue } from '../ErrorAlert';

interface SocialMediaCreatorProps {
  t: Translations;
  defaultLanguage: ContentLanguage;
  onSaveProject: (title: string, category: ProjectCategory, content: string) => void;
  onOpenInEditor: (draft: EditorDraft) => void;
}

const CONTENT_TYPES = [
  'Instagram captions',
  'Facebook posts',
  'YouTube titles',
  'YouTube descriptions',
  'Hashtag suggestions',
  'Short promotional content',
  'Product descriptions',
  'Business announcements',
];

const TONES = ['Professional', 'Friendly', 'Informative', 'Funny', 'Emotional', 'Promotional'];
const LENGTH_PRESETS = ['Very Short', 'Short', 'Medium', 'Detailed'];

export const SocialMediaCreator: React.FC<SocialMediaCreatorProps> = ({
  t,
  defaultLanguage,
  onSaveProject,
  onOpenInEditor,
}) => {
  const [contentType, setContentType] = useState(CONTENT_TYPES[0]);
  const [tone, setTone] = useState('Professional');
  const [language, setLanguage] = useState<ContentLanguage>(defaultLanguage);
  const [topic, setTopic] = useState('');
  const [details, setDetails] = useState('');
  const [lengthPreset, setLengthPreset] = useState('Medium');
  const [customLengthValue, setCustomLengthValue] = useState('');
  const [customLengthUnit, setCustomLengthUnit] = useState<SocialLengthUnit>('words');
  const [includeCta, setIncludeCta] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorBannerValue>(null);
  const [result, setResult] = useState<SocialResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedTags, setCopiedTags] = useState(false);

  const isCustomLength = lengthPreset === 'custom';

  const buildPayload = () => ({
    contentType,
    tone,
    language,
    topic,
    details,
    includeCta,
    lengthPreset: isCustomLength ? '' : lengthPreset,
    lengthMode: isCustomLength ? 'custom' : 'preset',
    customLengthValue: isCustomLength ? customLengthValue.trim() : '',
    customLengthUnit,
  });

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim()) {
      setError(t.common.requiredField);
      return;
    }
    const uiLang = t.common.save === 'प्रोजेक्ट सेव करें' ? 'hi' : 'en';
    if (isCustomLength) {
      const check = validateSocialCustomLength(customLengthValue, customLengthUnit, uiLang);
      if (!check.valid) {
        setError(check.error || t.common.requiredField);
        return;
      }
    }
    setError(null);
    setLoading(true);
    try {
      const data = await generateWithAI<SocialResult>('social', buildPayload(), {
        scope: 'text',
        moduleId: 'social',
      });
      setResult(data);
      setIsEditing(false);
    } catch (err) {
      setError(formatModuleError(err, 'social', uiLang, Boolean(result)));
    } finally {
      setLoading(false);
    }
  };

  const plainText = result ? formatSocialAsText(result) : '';

  const copyHashtags = async () => {
    if (!result?.hashtags?.length) return;
    const ok = await copyToClipboard(result.hashtags.join(' '));
    if (ok) {
      setCopiedTags(true);
      setTimeout(() => setCopiedTags(false), 1500);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">{t.social.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.social.subtitle}</p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleGenerate}
          className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.social.contentTypeLabel}
            </label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600"
            >
              {CONTENT_TYPES.map((ct) => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.social.toneLabel}
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.social.languageLabel}
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
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.social.lengthLabel}
            </label>
            <select
              value={lengthPreset}
              onChange={(e) => setLengthPreset(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600"
            >
              {LENGTH_PRESETS.map((lp) => (
                <option key={lp} value={lp}>
                  {lp}
                </option>
              ))}
              <option value="custom">{t.common.customOption}</option>
            </select>
          </div>

          {isCustomLength && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.social.customLengthLabel} *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={10}
                  max={5000}
                  value={customLengthValue}
                  onChange={(e) => setCustomLengthValue(e.target.value)}
                  placeholder={t.social.customLengthPlaceholder}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-blue-300 bg-blue-50/30 focus:outline-none focus:border-blue-600 tabular-nums"
                />
                <select
                  value={customLengthUnit}
                  onChange={(e) => setCustomLengthUnit(e.target.value as SocialLengthUnit)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-blue-300 bg-blue-50/30 focus:outline-none focus:border-blue-600"
                >
                  <option value="words">{t.common.words}</option>
                  <option value="characters">{t.common.characters}</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.social.topicLabel} *
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t.social.topicPlaceholder}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.social.detailsLabel}
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t.social.detailsPlaceholder}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
            />
          </div>

          <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={includeCta}
              onChange={(e) => setIncludeCta(e.target.checked)}
              className="rounded border-slate-300 text-blue-600"
            />
            <span>{t.social.includeCta}</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#0B1221] text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            <span>{loading ? t.common.generating : t.common.generate}</span>
          </button>
        </form>

        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          {!result && !loading ? (
            <div className="py-16 text-center">
              <Share2 className="w-9 h-9 text-slate-300 mx-auto mb-3" />
              <div className="text-base font-semibold text-slate-900">{t.social.title}</div>
              <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">{t.social.subtitle}</p>
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
                title={`${contentType} - ${topic}`}
                plainText={plainText}
                isEditing={isEditing}
                onToggleEdit={() => setIsEditing((v) => !v)}
                onRegenerate={() => handleGenerate()}
                onSaveProject={() => onSaveProject(`${contentType}: ${topic}`, 'social', plainText)}
                onOpenInEditor={() =>
                  onOpenInEditor({
                    title: `${contentType}: ${topic}`,
                    category: 'social',
                    content: plainText,
                    regenerateContext: { mode: 'social', payload: buildPayload() },
                  })
                }
                busy={loading}
              />

              <div className="space-y-4">
                {result.targetLengthLabel && (
                  <div className="text-xs text-slate-500 tabular-nums">
                    {t.common.activeTarget} {result.targetLengthLabel} · {countWords(result.primaryContent)} {t.common.words} · {result.primaryContent.length} {t.common.characters}
                  </div>
                )}
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs font-semibold text-slate-500 mb-1">{t.social.hookHeading}</div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={result.headlineOrHook}
                      onChange={(e) => setResult({ ...result, headlineOrHook: e.target.value })}
                      className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 bg-white"
                    />
                  ) : (
                    <div className="text-base font-bold text-slate-900">{result.headlineOrHook}</div>
                  )}
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1.5">{t.social.primaryHeading}</div>
                  {isEditing ? (
                    <textarea
                      rows={6}
                      value={result.primaryContent}
                      onChange={(e) => setResult({ ...result, primaryContent: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                    />
                  ) : (
                    <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                      {result.primaryContent}
                    </p>
                  )}
                </div>

                {result.ctaLine && (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-xs font-semibold text-slate-500 mb-1">{t.social.ctaHeading}</div>
                    <p className="text-sm font-medium text-slate-900">{result.ctaLine}</p>
                  </div>
                )}

                {result.hashtags?.length > 0 && (
                  <div className="pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-slate-500">{t.social.hashtagsHeading}</span>
                      <button
                        type="button"
                        onClick={copyHashtags}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                      >
                        {copiedTags ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedTags ? t.common.copied : t.common.copy}</span>
                      </button>
                    </div>
                    <div className="text-sm font-mono text-slate-700 leading-relaxed">
                      {result.hashtags.join(' ')}
                    </div>
                  </div>
                )}

                {result.alternativeVersions?.length > 0 && (
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <div className="text-xs font-semibold text-slate-500">{t.social.alternativesHeading}</div>
                    {result.alternativeVersions.map((alt, i) => (
                      <div key={i} className="p-3.5 rounded-lg border border-slate-200 text-sm text-slate-700 whitespace-pre-line">
                        {alt}
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
