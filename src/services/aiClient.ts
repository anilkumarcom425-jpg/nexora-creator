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
  partialPartsCompleted?: number;

  constructor(
    message: string,
    code = 'UNKNOWN_ERROR',
    status = 500,
    extra?: {
      scope?: ApiScope;
      module?: string;
      retryAfterSeconds?: number;
      partialPartsCompleted?: number;
    }
  ) {
    super(message);
    this.name = 'AIRequestError';
    this.code = code;
    this.status = status;
    this.scope = extra?.scope ?? 'text';
    this.module = extra?.module ?? 'unknown';
    this.retryAfterSeconds = extra?.retryAfterSeconds;
    this.partialPartsCompleted = extra?.partialPartsCompleted;
  }
}

interface ScopeCooldownState {
  until: number;
  code: string;
}

class ClientScopeQueue {
  private readonly minSpacingMs: number;
  private readonly maxQueueSize: number;
  private lastStart = 0;
  private chain: Promise<void> = Promise.resolve();
  private queuedCount = 0;

  constructor(minSpacingMs: number, maxQueueSize = 6) {
    this.minSpacingMs = minSpacingMs;
    this.maxQueueSize = maxQueueSize;
  }

  run<T>(scope: ApiScope, moduleName: string, fn: () => Promise<T>): Promise<T> {
    if (this.queuedCount >= this.maxQueueSize) {
      return Promise.reject(
        new AIRequestError(
          'Too many pending requests in queue.',
          'QUEUE_OVERLOADED',
          429,
          { scope, module: moduleName, retryAfterSeconds: 5 }
        )
      );
    }

    this.queuedCount += 1;
    const execute = async (): Promise<T> => {
      const waitMs = Math.max(0, this.lastStart + this.minSpacingMs - Date.now());
      if (waitMs > 0) {
        await new Promise((r) => setTimeout(r, waitMs));
      }
      this.lastStart = Date.now();
      return fn();
    };

    const resultPromise = this.chain.then(execute, execute);
    this.chain = resultPromise.then(
      () => undefined,
      () => undefined
    );
    return resultPromise.finally(() => {
      this.queuedCount = Math.max(0, this.queuedCount - 1);
    });
  }
}

const scopeQueues: Record<ApiScope, ClientScopeQueue> = {
  text: new ClientScopeQueue(250, 8),
  image: new ClientScopeQueue(1000, 4),
};

const scopeCooldowns: Record<ApiScope, ScopeCooldownState | null> = {
  text: null,
  image: null,
};

const inFlightByModule = new Set<string>();

export function resetClientRateGuards(): void {
  scopeCooldowns.text = null;
  scopeCooldowns.image = null;
  inFlightByModule.clear();
}

export async function checkApiHealth(): Promise<HealthStatus> {
  const res = await fetch('/api/health');
  if (!res.ok) {
    throw new AIRequestError('Failed to check server status', 'HEALTH_CHECK_FAILED', res.status);
  }
  return res.json() as Promise<HealthStatus>;
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
  const inFlightKey = `${scope}:${moduleId}`;

  const activeCooldown = scopeCooldowns[scope];
  if (activeCooldown && Date.now() < activeCooldown.until) {
    const remainingSec = Math.max(1, Math.ceil((activeCooldown.until - Date.now()) / 1000));
    throw new AIRequestError(
      `Cooldown active for ${scope} generation`,
      activeCooldown.code,
      429,
      { scope, module: moduleId, retryAfterSeconds: remainingSec }
    );
  }

  if (inFlightByModule.has(inFlightKey)) {
    throw new AIRequestError(
      'A request for this module is already running.',
      'CLIENT_REQUEST_IN_PROGRESS',
      429,
      { scope, module: moduleId, retryAfterSeconds: 3 }
    );
  }

  inFlightByModule.add(inFlightKey);
  try {
    return await scopeQueues[scope].run(scope, moduleId, async () => {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, payload }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        result?: T;
        error?: string;
        code?: string;
        scope?: ApiScope;
        module?: string;
        retryAfterSeconds?: number;
        partialPartsCompleted?: number;
      };

      const retryAfterHeader = res.headers.get('Retry-After');
      const retryAfterSeconds =
        typeof data.retryAfterSeconds === 'number'
          ? data.retryAfterSeconds
          : retryAfterHeader
          ? Number(retryAfterHeader) || undefined
          : undefined;

      if (!res.ok || !data.result) {
        const code = data.code || (res.status === 429 ? 'RATE_LIMIT_EXCEEDED' : 'API_ERROR');
        if (res.status === 429 && retryAfterSeconds && retryAfterSeconds > 0) {
          const clampedSec = Math.min(retryAfterSeconds, 120);
          scopeCooldowns[scope] = {
            until: Date.now() + clampedSec * 1000,
            code,
          };
        }
        throw new AIRequestError(
          data.error || `Request failed with status ${res.status}`,
          code,
          res.status,
          {
            scope: data.scope ?? scope,
            module: data.module ?? moduleId,
            retryAfterSeconds,
            partialPartsCompleted: data.partialPartsCompleted,
          }
        );
      }

      scopeCooldowns[scope] = null;
      return data.result;
    });
  } finally {
    inFlightByModule.delete(inFlightKey);
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
