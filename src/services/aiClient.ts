import { GoogleGenAI } from '@google/genai';
import {
  BlogResult,
  HealthStatus,
  LongVideoResult,
  PromptResult,
  ShortsResult,
  SocialResult,
  StoryResult,
} from '../types/nexora';

export type ApiScope = 'text' | 'image';

export class AIRequestError extends Error {
  code: string;
  status: number;
  scope: ApiScope;
  module: string;
  retryAfterSeconds?: number;

  constructor(
    message: string,
    code = 'UNKNOWN_ERROR',
    status = 500,
    extra?: {
      scope?: ApiScope;
      module?: string;
      retryAfterSeconds?: number;
    }
  ) {
    super(message);
    this.name = 'AIRequestError';
    this.code = code;
    this.status = status;
    this.scope = extra?.scope ?? 'text';
    this.module = extra?.module ?? 'unknown';
    this.retryAfterSeconds = extra?.retryAfterSeconds;
  }
}

const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
const ai = new GoogleGenAI({ apiKey });

export function resetClientRateGuards(): void {}

export async function checkApiHealth(): Promise<HealthStatus> {
  return { status: 'healthy', timestamp: new Date().toISOString() };
}

export async function generateWithAI<T>(
  mode: string,
  payload: Record<string, unknown>,
  options?: { scope?: ApiScope; moduleId?: string }
): Promise<T> {
  const scope: ApiScope =
    options?.scope ??
    (mode === 'image' || payload.apiScope === 'image' || payload.generationType === 'image'
      ? 'image'
      : 'text');
  const moduleId = options?.moduleId ?? mode;

  if (!apiKey) {
    throw new AIRequestError(
      'Gemini API Key is missing. Please set VITE_GEMINI_API_KEY in Netlify settings.',
      'API_KEY_MISSING',
      400,
      { scope, module: moduleId }
    );
  }

  const promptText = typeof payload.prompt === 'string' 
    ? payload.prompt 
    : JSON.stringify(payload);

  try {
    const modelName = scope === 'image' ? 'imagen-3.0-generate-002' : 'gemini-2.5-flash';
    
    const response = await ai.models.generateContent({
      model: modelName,
      contents: promptText,
    });

    const textResult = response.text;
    if (!textResult) {
      throw new AIRequestError('No response received from Gemini AI.', 'EMPTY_RESPONSE', 500, { scope, module: moduleId });
    }

    try {
      return JSON.parse(textResult) as T;
    } catch {
      return textResult as unknown as T;
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown AI generation error';
    throw new AIRequestError(errorMessage, 'GEMINI_API_ERROR', 500, { scope, module: moduleId });
  }
}

export function formatBlogAsText(blog: BlogResult): string {
  const parts: string[] = [
    blog.seoTitle,
    ...(blog.targetLengthLabel ? [`Target Length: ${blog.targetLengthLabel}`] : []),
    `Meta Description: ${blog.metaDescription}`,
    '',
    blog.introduction,
    '',
  ];

  for (const sec of blog.sections) {
    const partPrefix = sec.partNumber ? `[Part ${sec.partNumber}] ` : '';
    parts.push(`## ${partPrefix}${sec.h2}`, sec.content, '');
    for (const sub of sec.subsections || []) {
      parts.push(`### ${sub.h3}`, sub.content, '');
    }
  }

  if (blog.examples?.length) {
    parts.push('## Examples');
    blog.examples.forEach((ex, i) => parts.push(`${i + 1}. ${ex}`));
    parts.push('');
  }

  parts.push('## Conclusion', blog.conclusion, '', '## FAQs');
  blog.faqs.slice(0, 3).forEach((faq, i) => {
    parts.push(`Q${i + 1}: ${faq.question}`, `A${i + 1}: ${faq.answer}`, '');
  });

  if (blog.seoKeywordSuggestions?.length) {
    parts.push(`SEO Keywords: ${blog.seoKeywordSuggestions.join(', ')}`);
  }

  return parts.join('\n');
}

export function formatShortsAsText(shorts: ShortsResult): string {
  const lines: string[] = [
    shorts.title,
    ...(shorts.targetLengthLabel ? [`Target Duration: ${shorts.targetLengthLabel}`] : []),
    '',
    `Hook: ${shorts.hook}`,
    `Character Consistency Guide: ${shorts.characterAppearanceGuide}`,
    '',
  ];
  for (const scene of shorts.scenes) {
    const partPrefix = scene.partNumber ? `Part ${scene.partNumber} · ` : '';
    lines.push(
      `--- ${partPrefix}Scene ${scene.sceneNumber} (${scene.durationEstimate}) ---`,
      `Speaker: ${scene.speakingCharacter}`,
      `Dialogue: "${scene.dialogue}"`,
      `Visuals: ${scene.visualDescription}`,
      `AI Image Prompt: ${scene.aiImagePrompt}`,
      `AI Video Prompt: ${scene.aiVideoPrompt}`,
      ''
    );
  }
  lines.push(`Ending: ${shorts.ending}`);
  if (shorts.likeSubscribeLine) {
    lines.push(`CTA: ${shorts.likeSubscribeLine}`);
  }
  return lines.join('\n');
}

export function formatLongVideoAsText(video: LongVideoResult): string {
  const lines: string[] = [
    video.videoTitle,
    ...(video.targetLengthLabel ? [`Target Duration: ${video.targetLengthLabel}`] : []),
    '',
    `Opening Hook:\n${video.openingHook}`,
    '',
    `Introduction:\n${video.introduction}`,
    '',
  ];
  for (const sec of video.sections) {
    const partPrefix = sec.partNumber ? `Part ${sec.partNumber} · ` : '';
    lines.push(
      `[${partPrefix}${sec.timestamp}] ${sec.sectionTitle}`,
      sec.scriptContent,
      `Scene Suggestion: ${sec.sceneSuggestion}`,
      `Transition: ${sec.transition}`,
      ''
    );
  }
  lines.push(`Conclusion:\n${video.conclusion}`, '', `Viewer Engagement CTA:\n${video.viewerCta}`);
  return lines.join('\n');
}

export function formatSocialAsText(social: SocialResult): string {
  const lines: string[] = [
    `Hook / Title: ${social.headlineOrHook}`,
    ...(social.targetLengthLabel ? [`Target Length: ${social.targetLengthLabel}`] : []),
    '',
    social.primaryContent,
    '',
  ];
  if (social.ctaLine) {
    lines.push(`CTA: ${social.ctaLine}`, '');
  }
  if (social.hashtags?.length) {
    lines.push(`Hashtags: ${social.hashtags.join(' ')}`, '');
  }
  if (social.alternativeVersions?.length) {
    lines.push('--- Variations ---');
    social.alternativeVersions.forEach((v, i) => lines.push(`${i + 1}. ${v}`, ''));
  }
  return lines.join('\n');
}

export function formatStoryAsText(story: StoryResult): string {
  const lines: string[] = [
    story.storyTitle,
    ...(story.targetLengthLabel ? [`Target Length: ${story.targetLengthLabel}`] : []),
    '',
    `Character Reference Summary:\n${story.characterReferenceSummary}`,
    '',
  ];
  for (const scene of story.scenes) {
    const partPrefix = scene.partNumber ? `Part ${scene.partNumber} · ` : '';
    lines.push(`--- ${partPrefix}Scene ${scene.sceneNumber}: ${scene.locationAndMood} ---`, scene.narrative, '');
    if (scene.dialogues?.length) {
      scene.dialogues.forEach((d) => lines.push(`${d.characterName}: "${d.line}"`));
      lines.push('');
    }
    lines.push(`AI Image Prompt: ${scene.aiImagePrompt}`, `AI Video Prompt: ${scene.aiVideoPrompt}`, '');
  }
  lines.push(`Ending:\n${story.ending}`);
  return lines.join('\n');
}

export function formatPromptAsText(p: PromptResult): string {
  const lines: string[] = [
    p.title,
    '',
    `Main Prompt:\n${p.mainPrompt}`,
    '',
    `Camera, Lighting & Notes:\n${p.technicalAndLightingNotes}`,
    '',
    `Avoid / Negative:\n${p.negativeOrAvoid}`,
    '',
  ];
  if (p.variations?.length) {
    lines.push('Variations:');
    p.variations.forEach((v, i) => lines.push(`${i + 1}. ${v}`));
  }
  return lines.join('\n');
    }
