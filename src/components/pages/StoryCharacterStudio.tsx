import React, { useState } from 'react';
import { BookOpen, Check, Copy, Loader2, Plus, Trash2, UserCheck, UserPlus } from 'lucide-react';
import { Translations } from '../../i18n/translations';
import { formatStoryAsText, generateWithAI } from '../../services/aiClient';
import { copyToClipboard, countWords } from '../../services/storage';
import {
  CharacterProfile,
  ContentLanguage,
  EditorDraft,
  ProjectCategory,
  StoryResult,
} from '../../types/nexora';
import { validateCustomWordCount } from '../../utils/lengthValidation';
import { formatModuleError } from '../../utils/errorMessages';
import { ActionToolbar } from '../ActionToolbar';
import { ErrorAlert, ErrorBannerValue } from '../ErrorAlert';

interface StoryCharacterStudioProps {
  t: Translations;
  defaultLanguage: ContentLanguage;
  characters: CharacterProfile[];
  onSaveCharacters: (next: CharacterProfile[]) => void;
  onSaveProject: (title: string, category: ProjectCategory, content: string) => void;
  onOpenInEditor: (draft: EditorDraft) => void;
}

const GENRES = ['Moral Story', 'Drama', 'Kids Adventure', 'Sci-Fi', 'Mystery / Thriller', 'Comedy', 'Historical'];
const TONES = ['Engaging', 'Warm & Emotional', 'Suspenseful', 'Lighthearted', 'Epic'];
const STORY_LENGTHS = ['Short', 'Medium', 'Long'];

export const StoryCharacterStudio: React.FC<StoryCharacterStudioProps> = ({
  t,
  defaultLanguage,
  characters,
  onSaveCharacters,
  onSaveProject,
  onOpenInEditor,
}) => {
  // Character builder form
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [charName, setCharName] = useState('');
  const [charRole, setCharRole] = useState('');
  const [charPersonality, setCharPersonality] = useState('');
  const [charAppearance, setCharAppearance] = useState('');
  const [charVoice, setCharVoice] = useState('');
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>(() =>
    characters.slice(0, 2).map((c) => c.id)
  );

  // Story form
  const [premise, setPremise] = useState('');
  const [genre, setGenre] = useState(GENRES[0]);
  const [tone, setTone] = useState(TONES[0]);
  const [sceneCount, setSceneCount] = useState(4);
  const [lengthPreset, setLengthPreset] = useState('Medium');
  const [customWordCount, setCustomWordCount] = useState('');
  const [language, setLanguage] = useState<ContentLanguage>(defaultLanguage);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorBannerValue>(null);
  const [story, setStory] = useState<StoryResult | null>(null);
  const [isEditingStory, setIsEditingStory] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const resetCharForm = () => {
    setEditingCharId(null);
    setCharName('');
    setCharRole('');
    setCharPersonality('');
    setCharAppearance('');
    setCharVoice('');
  };

  const handleSaveCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!charName.trim() || !charAppearance.trim()) return;

    if (editingCharId) {
      const updated = characters.map((c) =>
        c.id === editingCharId
          ? {
              ...c,
              name: charName.trim(),
              role: charRole.trim() || 'Lead',
              personality: charPersonality.trim() || 'Balanced',
              appearance: charAppearance.trim(),
              voiceStyle: charVoice.trim() || 'Natural',
            }
          : c
      );
      onSaveCharacters(updated);
    } else {
      const created: CharacterProfile = {
        id: `char_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: charName.trim(),
        role: charRole.trim() || 'Lead',
        personality: charPersonality.trim() || 'Curious and kind',
        appearance: charAppearance.trim(),
        voiceStyle: charVoice.trim() || 'Clear and expressive',
        createdAt: new Date().toISOString(),
      };
      onSaveCharacters([created, ...characters]);
      setSelectedCharIds((prev) => [...prev, created.id]);
    }
    resetCharForm();
  };

  const handleEditCharacter = (c: CharacterProfile) => {
    setEditingCharId(c.id);
    setCharName(c.name);
    setCharRole(c.role);
    setCharPersonality(c.personality);
    setCharAppearance(c.appearance);
    setCharVoice(c.voiceStyle);
  };

  const handleDeleteCharacter = (id: string) => {
    onSaveCharacters(characters.filter((c) => c.id !== id));
    setSelectedCharIds((prev) => prev.filter((cid) => cid !== id));
    if (editingCharId === id) resetCharForm();
  };

  const toggleCharacterSelection = (id: string) => {
    setSelectedCharIds((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const selectedCharacters = characters.filter((c) => selectedCharIds.includes(c.id));

  const isCustomLength = lengthPreset === 'custom';

  const buildPayload = () => ({
    premise,
    genre,
    tone,
    sceneCount,
    language,
    lengthPreset: isCustomLength ? '' : lengthPreset,
    lengthMode: isCustomLength ? 'custom' : 'preset',
    customWordCount: isCustomLength ? customWordCount.trim() : '',
    characters: selectedCharacters,
  });

  const handleGenerateStory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!premise.trim()) {
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
      const data = await generateWithAI<StoryResult>('story', buildPayload(), {
        scope: 'text',
        moduleId: 'story',
      });
      setStory(data);
      setIsEditingStory(false);
    } catch (err) {
      setError(formatModuleError(err, 'story', uiLang, Boolean(story)));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (key: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    }
  };

  const plainText = story ? formatStoryAsText(story) : '';

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">{t.story.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.story.subtitle}</p>
      </div>

      <ErrorAlert message={error} onDismiss={() => setError(null)} />

      {/* Character Reference System */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-slate-900">{t.story.charStudioTitle}</h3>
          <span className="text-xs text-slate-500 tabular-nums">
            {characters.length} {t.common.localStorageBadge}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form onSubmit={handleSaveCharacter} className="lg:col-span-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.story.charName} *
                </label>
                <input
                  type="text"
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.story.charRole}
                </label>
                <input
                  type="text"
                  value={charRole}
                  onChange={(e) => setCharRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.story.charPersonality}
              </label>
              <input
                type="text"
                value={charPersonality}
                onChange={(e) => setCharPersonality(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.story.charAppearance} *
              </label>
              <textarea
                rows={2}
                value={charAppearance}
                onChange={(e) => setCharAppearance(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t.story.charVoice}
              </label>
              <input
                type="text"
                value={charVoice}
                onChange={(e) => setCharVoice(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0B1221] text-white hover:bg-slate-800"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{editingCharId ? t.story.updateCharacter : t.story.saveCharacter}</span>
              </button>
              {editingCharId && (
                <button
                  type="button"
                  onClick={resetCharForm}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  {t.common.cancel}
                </button>
              )}
            </div>
          </form>

          {/* Saved Characters List */}
          <div className="lg:col-span-7 space-y-3">
            <div className="text-xs font-semibold text-slate-700">
              {t.story.savedCharactersTitle}
            </div>
            <p className="text-xs text-slate-500">{t.story.selectHint}</p>

            {characters.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg text-sm text-slate-500">
                {t.story.noCharacters}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {characters.map((char) => {
                  const selected = selectedCharIds.includes(char.id);
                  return (
                    <div
                      key={char.id}
                      className={`p-3.5 rounded-lg border transition-colors ${
                        selected
                          ? 'border-blue-600 bg-blue-50/40'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <label className="flex items-center gap-2 cursor-pointer min-w-0">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleCharacterSelection(char.id)}
                            className="rounded border-slate-300 text-blue-600"
                          />
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {char.name}
                          </span>
                        </label>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditCharacter(char)}
                            className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                          >
                            {t.common.edit}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCharacter(char.id)}
                            className="p-1 text-slate-400 hover:text-red-600"
                            aria-label={t.common.delete}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {char.role} · {char.personality}
                      </div>
                      <p className="mt-1.5 text-xs text-slate-700 line-clamp-2">
                        {char.appearance}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Story Generator + Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleGenerateStory}
          className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.story.premiseLabel} *
            </label>
            <textarea
              rows={3}
              value={premise}
              onChange={(e) => setPremise(e.target.value)}
              placeholder={t.story.premisePlaceholder}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.story.genreLabel}
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600"
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.story.sceneCountLabel}
              </label>
              <select
                value={sceneCount}
                onChange={(e) => setSceneCount(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600 tabular-nums"
              >
                {[3, 4, 5, 6, 7, 8, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.story.toneLabel}
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
                {t.story.languageLabel}
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
              {t.story.lengthLabel}
            </label>
            <select
              value={lengthPreset}
              onChange={(e) => setLengthPreset(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600"
            >
              {STORY_LENGTHS.map((len) => (
                <option key={len} value={len}>
                  {len === 'Short'
                    ? 'Short (~450 words)'
                    : len === 'Medium'
                    ? 'Medium (~900 words)'
                    : 'Long (~1800 words)'}
                </option>
              ))}
              <option value="custom">{t.common.customOption}</option>
            </select>
          </div>

          {isCustomLength && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.story.customWordCountLabel} *
              </label>
              <input
                type="number"
                min={150}
                max={10000}
                step={50}
                value={customWordCount}
                onChange={(e) => setCustomWordCount(e.target.value)}
                placeholder={t.story.customWordCountPlaceholder}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-blue-300 bg-blue-50/30 focus:outline-none focus:border-blue-600 tabular-nums"
              />
            </div>
          )}

          {selectedCharacters.length > 0 && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="truncate">
                {selectedCharacters.map((c) => c.name).join(', ')}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#0B1221] text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>{loading ? t.common.generating : t.story.generateStory}</span>
          </button>
        </form>

        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          {!story && !loading ? (
            <div className="py-16 text-center">
              <BookOpen className="w-9 h-9 text-slate-300 mx-auto mb-3" />
              <div className="text-base font-semibold text-slate-900">{t.story.title}</div>
              <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">{t.story.subtitle}</p>
            </div>
          ) : !story && loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#0B1221] mx-auto" />
              <div className="text-sm font-medium text-slate-600">{t.common.generating}</div>
            </div>
          ) : story ? (
            <div className="space-y-6">
              {loading && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs font-medium text-blue-900">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-700 shrink-0" />
                  <span>{t.common.preservingContentWhileRetrying}</span>
                </div>
              )}
              <ActionToolbar
                t={t}
                title={story.storyTitle || premise}
                plainText={plainText}
                isEditing={isEditingStory}
                onToggleEdit={() => setIsEditingStory((v) => !v)}
                onRegenerate={() => handleGenerateStory()}
                onSaveProject={() => onSaveProject(story.storyTitle || premise, 'story', plainText)}
                onOpenInEditor={() =>
                  onOpenInEditor({
                    title: story.storyTitle || premise,
                    category: 'story',
                    content: plainText,
                    regenerateContext: { mode: 'story', payload: buildPayload() },
                  })
                }
                busy={loading}
              />

              <div className="space-y-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  {isEditingStory ? (
                    <input
                      type="text"
                      value={story.storyTitle}
                      onChange={(e) => setStory({ ...story, storyTitle: e.target.value })}
                      className="flex-1 px-3 py-2 text-lg font-bold rounded-lg border border-slate-300"
                    />
                  ) : (
                    <h3 className="text-xl font-bold text-slate-900">{story.storyTitle}</h3>
                  )}
                  <div className="text-xs text-slate-500 tabular-nums">
                    {story.targetLengthLabel && (
                      <>
                        <span>{t.common.activeTarget} {story.targetLengthLabel}</span>
                        <span aria-hidden="true"> · </span>
                      </>
                    )}
                    <span>{countWords(plainText)} {t.common.words}</span>
                    {story.totalParts && story.totalParts > 1 && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span>{story.totalParts} {t.common.partLabel}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    {t.story.characterSummaryHeading}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {story.characterReferenceSummary}
                  </p>
                </div>

                <div className="space-y-4">
                  {story.scenes.map((scene, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="text-xs font-semibold text-slate-500 tabular-nums">
                        {scene.partNumber ? `${t.common.partLabel} ${scene.partNumber} · ` : ''}
                        {t.shorts.sceneLabel} {scene.sceneNumber} · {scene.locationAndMood}
                      </div>

                      {isEditingStory ? (
                        <textarea
                          rows={3}
                          value={scene.narrative}
                          onChange={(e) => {
                            const next = [...story.scenes];
                            next[idx] = { ...next[idx], narrative: e.target.value };
                            setStory({ ...story, scenes: next });
                          }}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                        />
                      ) : (
                        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                          {scene.narrative}
                        </p>
                      )}

                      {scene.dialogues?.length > 0 && (
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                          <div className="text-xs font-semibold text-slate-500">
                            {t.story.dialoguesHeading}
                          </div>
                          {scene.dialogues.map((d, dIdx) => (
                            <div key={dIdx} className="text-sm text-slate-800">
                              <span className="font-semibold text-[#0B1221]">{d.characterName}: </span>
                              <span>“{d.line}”</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-semibold text-slate-600">
                              {t.story.imagePromptLabel}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(`s-img-${idx}`, scene.aiImagePrompt)}
                              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              {copiedKey === `s-img-${idx}` ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedKey === `s-img-${idx}` ? t.common.copied : t.common.copy}</span>
                            </button>
                          </div>
                          <p className="text-xs font-mono text-slate-700 leading-relaxed">
                            {scene.aiImagePrompt}
                          </p>
                        </div>

                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-semibold text-slate-600">
                              {t.story.videoPromptLabel}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(`s-vid-${idx}`, scene.aiVideoPrompt)}
                              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              {copiedKey === `s-vid-${idx}` ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedKey === `s-vid-${idx}` ? t.common.copied : t.common.copy}</span>
                            </button>
                          </div>
                          <p className="text-xs font-mono text-slate-700 leading-relaxed">
                            {scene.aiVideoPrompt}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    {t.story.endingHeading}
                  </div>
                  <p className="text-sm text-slate-800 leading-relaxed">{story.ending}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
