import React, { useState } from 'react';
import { Loader2, PenTool, Sparkles } from 'lucide-react';
import { Translations } from '../../i18n/translations';
import { formatBlogAsText, generateWithAI } from '../../services/aiClient';
import { countWords } from '../../services/storage';
import { BlogResult, ContentLanguage, EditorDraft, ProjectCategory } from '../../types/nexora';
import { validateCustomWordCount } from '../../utils/lengthValidation';
import { formatModuleError } from '../../utils/errorMessages';
import { ActionToolbar } from '../ActionToolbar';
import { ErrorAlert, ErrorBannerValue } from '../ErrorAlert';

interface BlogWriterProps {
  t: Translations;
  defaultLanguage: ContentLanguage;
  onSaveProject: (title: string, category: ProjectCategory, content: string) => void;
  onOpenInEditor: (draft: EditorDraft) => void;
}

const WORD_COUNTS = ['500', '800', '1000', '1500', '2000'];
const STYLES = ['Informative', 'Conversational', 'Professional', 'Storytelling', 'Educational', 'Technical'];

export const BlogWriter: React.FC<BlogWriterProps> = ({
  t,
  defaultLanguage,
  onSaveProject,
  onOpenInEditor,
}) => {
  const [topic, setTopic] = useState('');
  const [mainKeyword, setMainKeyword] = useState('');
  const [secondaryKeywords, setSecondaryKeywords] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [writingLanguage, setWritingLanguage] = useState<ContentLanguage>(defaultLanguage);
  const [writingStyle, setWritingStyle] = useState('Informative');
  const [wordCount, setWordCount] = useState('1000');
  const [customWordCount, setCustomWordCount] = useState('');

  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState<ErrorBannerValue>(null);
  const [blog, setBlog] = useState<BlogResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [paragraphInput, setParagraphInput] = useState('');
  const [paragraphOutput, setParagraphOutput] = useState('');

  const isCustomLength = wordCount === 'custom';

  const buildPayload = () => ({
    topic,
    mainKeyword,
    secondaryKeywords,
    targetAudience,
    writingLanguage,
    writingStyle,
    wordCount: isCustomLength ? customWordCount : wordCount,
    lengthMode: isCustomLength ? 'custom' : 'preset',
    customWordCount: isCustomLength ? customWordCount : '',
  });

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim()) {
      setError(t.common.requiredField);
      return;
    }
    const uiLang = t.common.save === 'प्रोजेक्ट सेव करें' ? 'hi' : 'en';
    if (isCustomLength) {
      const check = validateCustomWordCount(customWordCount, 150, 10000, uiLang);
      if (!check.valid) {
        setError(check.error || t.common.requiredField);
        return;
      }
    }
    setError(null);
    setLoading(true);
    try {
      const result = await generateWithAI<BlogResult>('blog', buildPayload(), {
        scope: 'text',
        moduleId: 'blog',
      });
      setBlog(result);
      setIsEditing(false);
    } catch (err) {
      setError(formatModuleError(err, 'blog', uiLang, Boolean(blog)));
    } finally {
      setLoading(false);
    }
  };

  const handleReadabilityOrTransform = async (action: 'improve' | 'expand' | 'summarize' | 'readability') => {
    if (!blog) return;
    const uiLang = t.common.save === 'प्रोजेक्ट सेव करें' ? 'hi' : 'en';
    setError(null);
    setRefining(true);
    try {
      const fullText = formatBlogAsText(blog);
      const res = await generateWithAI<{ text: string }>(
        'transform',
        {
          action,
          text: fullText,
          language: writingLanguage,
        },
        { scope: 'text', moduleId: 'blog' }
      );
      onOpenInEditor({
        title: blog.seoTitle || topic,
        category: 'blog',
        content: res.text,
        regenerateContext: { mode: 'blog', payload: buildPayload() },
      });
    } catch (err) {
      setError(formatModuleError(err, 'blog', uiLang, true));
    } finally {
      setRefining(false);
    }
  };

  const handleParagraphAction = async (action: 'rewrite' | 'expand' | 'shorten') => {
    if (!paragraphInput.trim()) return;
    const uiLang = t.common.save === 'प्रोजेक्ट सेव करें' ? 'hi' : 'en';
    setError(null);
    setRefining(true);
    try {
      const res = await generateWithAI<{ text: string }>(
        'transform',
        {
          action,
          text: paragraphInput,
          language: writingLanguage,
        },
        { scope: 'text', moduleId: 'blog' }
      );
      setParagraphOutput(res.text);
    } catch (err) {
      setError(formatModuleError(err, 'blog', uiLang, Boolean(blog || paragraphOutput.trim())));
    } finally {
      setRefining(false);
    }
  };

  const fullText = blog ? formatBlogAsText(blog) : '';

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">{t.blog.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.blog.subtitle}</p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Panel */}
        <form
          onSubmit={handleGenerate}
          className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.blog.topicLabel} *
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t.blog.topicPlaceholder}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.blog.mainKeywordLabel}
            </label>
            <input
              type="text"
              value={mainKeyword}
              onChange={(e) => setMainKeyword(e.target.value)}
              placeholder={t.blog.mainKeywordPlaceholder}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.blog.secondaryKeywordsLabel}
            </label>
            <input
              type="text"
              value={secondaryKeywords}
              onChange={(e) => setSecondaryKeywords(e.target.value)}
              placeholder={t.blog.secondaryKeywordsPlaceholder}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.blog.audienceLabel}
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder={t.blog.audiencePlaceholder}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.blog.languageLabel}
              </label>
              <select
                value={writingLanguage}
                onChange={(e) => setWritingLanguage(e.target.value as ContentLanguage)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600"
              >
                <option value="Hindi">हिंदी (Hindi)</option>
                <option value="English">English</option>
                <option value="Hinglish">Hinglish</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.blog.wordCountLabel}
              </label>
              <select
                value={wordCount}
                onChange={(e) => setWordCount(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600 tabular-nums"
              >
                {WORD_COUNTS.map((wc) => (
                  <option key={wc} value={wc}>
                    {wc} {t.common.words}
                  </option>
                ))}
                <option value="custom">{t.common.customOption}</option>
              </select>
            </div>
          </div>

          {isCustomLength && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.blog.customWordCountLabel} *
              </label>
              <input
                type="number"
                min={150}
                max={10000}
                step={50}
                value={customWordCount}
                onChange={(e) => setCustomWordCount(e.target.value)}
                placeholder={t.blog.customWordCountPlaceholder}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-blue-300 bg-blue-50/30 focus:outline-none focus:border-blue-600 tabular-nums"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.blog.styleLabel}
            </label>
            <select
              value={writingStyle}
              onChange={(e) => setWritingStyle(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600"
            >
              {STYLES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#0B1221] text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
            <span>{loading ? t.common.generating : t.common.generate}</span>
          </button>
        </form>

        {/* Output + Paragraph Polish Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
            {!blog && !loading ? (
              <div className="py-16 text-center">
                <PenTool className="w-9 h-9 text-slate-300 mx-auto mb-3" />
                <div className="text-base font-semibold text-slate-900">{t.blog.emptyResultTitle}</div>
                <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">{t.blog.emptyResultDesc}</p>
              </div>
            ) : !blog && loading ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#0B1221] mx-auto" />
                <div className="text-sm font-medium text-slate-600">{t.common.generating}</div>
              </div>
            ) : blog ? (
              <div className="space-y-6">
                {loading && (
                  <div className="flex items-center gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs font-medium text-blue-900">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-700 shrink-0" />
                    <span>{t.common.preservingContentWhileRetrying}</span>
                  </div>
                )}
                <ActionToolbar
                  t={t}
                  title={blog.seoTitle || topic}
                  plainText={fullText}
                  isEditing={isEditing}
                  onToggleEdit={() => setIsEditing((v) => !v)}
                  onRegenerate={() => handleGenerate()}
                  onTransform={(action) => handleReadabilityOrTransform(action)}
                  onSaveProject={() => onSaveProject(blog.seoTitle || topic, 'blog', fullText)}
                  onOpenInEditor={() =>
                    onOpenInEditor({
                      title: blog.seoTitle || topic,
                      category: 'blog',
                      content: fullText,
                      regenerateContext: { mode: 'blog', payload: buildPayload() },
                    })
                  }
                  busy={loading || refining}
                />

                {/* Extra Blog Readability Button & Length Info */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleReadabilityOrTransform('readability')}
                    disabled={refining}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t.common.readability}</span>
                  </button>
                  <div className="text-xs text-slate-500 tabular-nums">
                    {blog.targetLengthLabel && (
                      <>
                        <span>{t.common.activeTarget} {blog.targetLengthLabel}</span>
                        <span aria-hidden="true"> · </span>
                      </>
                    )}
                    <span>{countWords(fullText)} {t.common.words}</span>
                    {blog.totalParts && blog.totalParts > 1 && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span>{blog.totalParts} {t.common.partLabel}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* SEO Title & Meta Description */}
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">{t.blog.seoTitle}</div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={blog.seoTitle}
                        onChange={(e) => setBlog({ ...blog, seoTitle: e.target.value })}
                        className="w-full px-3 py-2 text-lg font-bold rounded-lg border border-slate-300"
                      />
                    ) : (
                      <h3 className="text-xl font-bold text-slate-900">{blog.seoTitle}</h3>
                    )}
                  </div>

                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-xs font-semibold text-slate-500 mb-1">{t.blog.metaDescription}</div>
                    {isEditing ? (
                      <textarea
                        rows={2}
                        value={blog.metaDescription}
                        onChange={(e) => setBlog({ ...blog, metaDescription: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                      />
                    ) : (
                      <p className="text-sm text-slate-700 leading-relaxed">{blog.metaDescription}</p>
                    )}
                  </div>

                  {/* Introduction */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-1.5">{t.blog.introduction}</h4>
                    {isEditing ? (
                      <textarea
                        rows={4}
                        value={blog.introduction}
                        onChange={(e) => setBlog({ ...blog, introduction: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                      />
                    ) : (
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{blog.introduction}</p>
                    )}
                  </div>

                  {/* H2/H3 Sections */}
                  <div className="space-y-5 pt-2 border-t border-slate-200">
                    {blog.sections.map((sec, sIdx) => (
                      <div key={sIdx} className="space-y-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={sec.h2}
                            onChange={(e) => {
                              const next = [...blog.sections];
                              next[sIdx] = { ...next[sIdx], h2: e.target.value };
                              setBlog({ ...blog, sections: next });
                            }}
                            className="w-full px-3 py-2 text-base font-bold rounded-lg border border-slate-300"
                          />
                        ) : (
                          <h4 className="text-base font-bold text-slate-900">{sec.h2}</h4>
                        )}

                        {isEditing ? (
                          <textarea
                            rows={4}
                            value={sec.content}
                            onChange={(e) => {
                              const next = [...blog.sections];
                              next[sIdx] = { ...next[sIdx], content: e.target.value };
                              setBlog({ ...blog, sections: next });
                            }}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                          />
                        ) : (
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{sec.content}</p>
                        )}

                        {sec.subsections?.map((sub, subIdx) => (
                          <div key={subIdx} className="pl-4 border-l border-slate-200 space-y-1.5">
                            {isEditing ? (
                              <>
                                <input
                                  type="text"
                                  value={sub.h3}
                                  onChange={(e) => {
                                    const next = [...blog.sections];
                                    const subs = [...next[sIdx].subsections];
                                    subs[subIdx] = { ...subs[subIdx], h3: e.target.value };
                                    next[sIdx] = { ...next[sIdx], subsections: subs };
                                    setBlog({ ...blog, sections: next });
                                  }}
                                  className="w-full px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-300"
                                />
                                <textarea
                                  rows={3}
                                  value={sub.content}
                                  onChange={(e) => {
                                    const next = [...blog.sections];
                                    const subs = [...next[sIdx].subsections];
                                    subs[subIdx] = { ...subs[subIdx], content: e.target.value };
                                    next[sIdx] = { ...next[sIdx], subsections: subs };
                                    setBlog({ ...blog, sections: next });
                                  }}
                                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                                />
                              </>
                            ) : (
                              <>
                                <h5 className="text-sm font-semibold text-slate-800">{sub.h3}</h5>
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{sub.content}</p>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Examples */}
                  {blog.examples?.length > 0 && (
                    <div className="pt-4 border-t border-slate-200 space-y-2">
                      <h4 className="text-sm font-bold text-slate-900">{t.blog.examplesHeading}</h4>
                      <ul className="space-y-2 list-disc list-inside text-sm text-slate-700">
                        {blog.examples.map((ex, i) => (
                          <li key={i} className="leading-relaxed">
                            {ex}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Conclusion */}
                  <div className="pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-bold text-slate-900 mb-1.5">{t.blog.conclusionHeading}</h4>
                    {isEditing ? (
                      <textarea
                        rows={3}
                        value={blog.conclusion}
                        onChange={(e) => setBlog({ ...blog, conclusion: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                      />
                    ) : (
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{blog.conclusion}</p>
                    )}
                  </div>

                  {/* Exactly 3 FAQs */}
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <h4 className="text-sm font-bold text-slate-900">{t.blog.faqsHeading}</h4>
                    {blog.faqs.slice(0, 3).map((faq, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                        {isEditing ? (
                          <>
                            <input
                              type="text"
                              value={faq.question}
                              onChange={(e) => {
                                const next = [...blog.faqs];
                                next[idx] = { ...next[idx], question: e.target.value };
                                setBlog({ ...blog, faqs: next });
                              }}
                              className="w-full px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-300 bg-white"
                            />
                            <textarea
                              rows={2}
                              value={faq.answer}
                              onChange={(e) => {
                                const next = [...blog.faqs];
                                next[idx] = { ...next[idx], answer: e.target.value };
                                setBlog({ ...blog, faqs: next });
                              }}
                              className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white"
                            />
                          </>
                        ) : (
                          <>
                            <div className="text-sm font-semibold text-slate-900">
                              {idx + 1}. {faq.question}
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{faq.answer}</p>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* SEO Keyword Suggestions */}
                  {blog.seoKeywordSuggestions?.length > 0 && (
                    <div className="pt-4 border-t border-slate-200">
                      <div className="text-xs font-semibold text-slate-500 mb-1.5">
                        {t.blog.keywordSuggestionsHeading}
                      </div>
                      <div className="text-sm text-slate-800">
                        {blog.seoKeywordSuggestions.join(' · ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Paragraph Rewrite / Expand / Shorten Tool */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">{t.blog.paragraphToolTitle}</h3>
            <textarea
              rows={3}
              value={paragraphInput}
              onChange={(e) => setParagraphInput(e.target.value)}
              placeholder={t.blog.paragraphToolPlaceholder}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleParagraphAction('rewrite')}
                disabled={refining || !paragraphInput.trim()}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#0B1221] text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {t.common.rewrite}
              </button>
              <button
                type="button"
                onClick={() => handleParagraphAction('expand')}
                disabled={refining || !paragraphInput.trim()}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {t.common.expand}
              </button>
              <button
                type="button"
                onClick={() => handleParagraphAction('shorten')}
                disabled={refining || !paragraphInput.trim()}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {t.common.shorten}
              </button>
            </div>
            {paragraphOutput && (
              <div className="pt-2">
                <textarea
                  rows={4}
                  value={paragraphOutput}
                  onChange={(e) => setParagraphOutput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-blue-200 bg-blue-50/40 focus:outline-none focus:border-blue-600"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
