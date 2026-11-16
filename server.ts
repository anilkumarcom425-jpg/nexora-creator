import crypto from 'crypto';
import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  ApiScope,
  classifyGeminiError,
  executeGuardedGeminiCall,
  GuardedGeminiError,
  logServerAiEvent,
  resolveApiScope,
} from './server/geminiGuard.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-2.5-flash';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseAiJson<T>(rawText: string | undefined, requiredKeys: string[] = []): T {
  const cleaned = (rawText ?? '').trim();
  if (!cleaned) {
    throw Object.assign(new Error('Gemini returned an empty response.'), {
      code: 'INVALID_AI_OUTPUT',
    });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw Object.assign(new Error('Gemini returned malformed JSON output.'), {
      code: 'INVALID_AI_OUTPUT',
    });
  }
  if (!parsed || typeof parsed !== 'object') {
    throw Object.assign(new Error('Gemini output structure is invalid.'), {
      code: 'INVALID_AI_OUTPUT',
    });
  }
  const obj = parsed as Record<string, unknown>;
  for (const key of requiredKeys) {
    const val = obj[key];
    if (val === undefined || val === null || (typeof val === 'string' && !val.trim())) {
      throw Object.assign(new Error(`Gemini output missing required field: ${key}`), {
        code: 'INVALID_AI_OUTPUT',
      });
    }
  }
  return parsed as T;
}

async function callGuarded<T>(
  moduleName: string,
  requestId: string,
  scope: ApiScope,
  fn: () => Promise<T>,
  maxRetries = 2
): Promise<T> {
  return executeGuardedGeminiCall(
    {
      module: moduleName,
      scope,
      model: MODEL_NAME,
      requestId,
      maxRetries,
    },
    fn
  );
}

function parsePositiveInt(val: unknown): number | null {
  if (typeof val === 'number' && Number.isInteger(val) && val > 0) return val;
  if (typeof val === 'string') {
    const match = val.trim().match(/^(\d+)$/);
    if (match) {
      const n = Number(match[1]);
      return Number.isInteger(n) && n > 0 ? n : null;
    }
  }
  return null;
}

function parseDurationSeconds(raw: unknown): number | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase();
  const minMatch = s.match(/^(\d+)\s*(minute|minutes|min|मिनट)/i);
  if (minMatch) return Number(minMatch[1]) * 60;
  const secMatch = s.match(/^(\d+)\s*(second|seconds|sec|सेकंड)/i);
  if (secMatch) return Number(secMatch[1]);
  const bare = parsePositiveInt(s);
  return bare;
}

function parseDurationMinutes(raw: unknown): number | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase();
  const minMatch = s.match(/^(\d+)\s*(minute|minutes|min|मिनट)?/i);
  if (minMatch) return Number(minMatch[1]);
  return null;
}

function formatClock(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(rem).padStart(2, '0')}:00`;
  }
  return `${String(rem).padStart(2, '0')}:00`;
}

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req: Request, res: Response) => {
  const client = getGeminiClient();
  res.json({
    ok: true,
    configured: client !== null,
    model: MODEL_NAME,
    storageMode: 'local_browser_storage',
  });
});

app.post('/api/generate', async (req: Request, res: Response) => {
  const { mode, payload } = req.body ?? {};
  const moduleName = typeof mode === 'string' && mode.trim() ? mode.trim() : 'unknown';
  const requestId = crypto.randomUUID().slice(0, 8);
  const apiScope = resolveApiScope(
    moduleName,
    typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : undefined
  );

  const ai = getGeminiClient();
  if (!ai) {
    logServerAiEvent({
      timestamp: new Date().toISOString(),
      requestId,
      module: moduleName,
      scope: apiScope,
      model: MODEL_NAME,
      event: 'error',
      attempt: 0,
      statusCode: 503,
      errorCode: 'MISSING_API_KEY',
      message: 'GEMINI_API_KEY is not configured on the server.',
    });
    res.status(503).json({
      code: 'MISSING_API_KEY',
      scope: apiScope,
      module: moduleName,
      error: 'GEMINI_API_KEY is not configured on the server. Please configure GEMINI_API_KEY in Settings > Secrets.',
    });
    return;
  }

  if (!mode || typeof payload !== 'object' || payload === null) {
    res.status(400).json({
      code: 'INVALID_REQUEST',
      scope: apiScope,
      module: moduleName,
      error: 'Missing generation mode or payload.',
    });
    return;
  }

  try {
    if (moduleName === 'image' || apiScope === 'image') {
      // Dedicated Image Generation rate-limit & queue lane — never auto-enables paid API or billing without explicit permission
      await callGuarded(
        'image',
        requestId,
        'image',
        async () => {
          throw Object.assign(
            new Error('Paid image generation models and billing are disabled unless explicitly permitted.'),
            { code: 'PAID_API_NOT_ENABLED' }
          );
        },
        0
      );
      return;
    }
    if (mode === 'blog') {
      const {
        topic,
        mainKeyword,
        secondaryKeywords,
        targetAudience,
        writingLanguage,
        writingStyle,
        wordCount,
        lengthMode,
        customWordCount,
      } = payload as Record<string, unknown>;

      if (!String(topic ?? '').trim()) {
        res.status(400).json({ code: 'VALIDATION_ERROR', error: 'Blog topic is required.' });
        return;
      }

      let targetWords = parsePositiveInt(wordCount) ?? 1000;
      if (lengthMode === 'custom' || (customWordCount !== undefined && String(customWordCount).trim() !== '')) {
        const parsedCustom = parsePositiveInt(customWordCount);
        if (!parsedCustom || parsedCustom < 150 || parsedCustom > 10000) {
          res.status(400).json({
            code: 'VALIDATION_ERROR',
            error: 'Custom blog word count must be a whole number between 150 and 10000 words.',
          });
          return;
        }
        targetWords = parsedCustom;
      }

      const targetLengthLabel = `${targetWords} words`;
      const partsTotal = targetWords > 2200 ? Math.min(4, Math.ceil(targetWords / 2000)) : 1;

      if (partsTotal === 1) {
        const systemInstruction = [
          'You are an expert editorial and SEO writer for NEXORA Creator.',
          `Write the entire blog response in ${String(writingLanguage || 'Hindi')}.`,
          `STRICT TARGET LENGTH: Approximately ${targetWords} words across introduction, H2/H3 sections, examples, conclusion, and FAQs.`,
          'STRICT FORMAT ISOLATION: Write ONLY an editorial blog article with H2/H3 headings and prose. NEVER include video script cues, character dialogues, scene numbers, or timestamps.',
          'Do NOT add fluff, filler, or generic AI disclaimers.',
          'Include practical, concrete examples relevant to the topic.',
          'Include EXACTLY 3 FAQs with clear, helpful answers after the conclusion.',
        ].join(' ');

        const prompt = [
          `Blog Topic: ${String(topic)}`,
          `Main Keyword: ${String(mainKeyword || topic)}`,
          `Secondary Keywords: ${String(secondaryKeywords || 'None specified')}`,
          `Target Audience: ${String(targetAudience || 'General readers')}`,
          `Writing Style: ${String(writingStyle || 'Informative')}`,
          `Target Word Count: ${targetWords} words`,
        ].join('\n');

        const response = await callGuarded('blog', requestId, apiScope, () =>
          ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  seoTitle: { type: Type.STRING },
                  metaDescription: { type: Type.STRING },
                  introduction: { type: Type.STRING },
                  sections: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        h2: { type: Type.STRING },
                        content: { type: Type.STRING },
                        subsections: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              h3: { type: Type.STRING },
                              content: { type: Type.STRING },
                            },
                            required: ['h3', 'content'],
                          },
                        },
                      },
                      required: ['h2', 'content', 'subsections'],
                    },
                  },
                  examples: { type: Type.ARRAY, items: { type: Type.STRING } },
                  conclusion: { type: Type.STRING },
                  faqs: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        question: { type: Type.STRING },
                        answer: { type: Type.STRING },
                      },
                      required: ['question', 'answer'],
                    },
                  },
                  seoKeywordSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: [
                  'seoTitle',
                  'metaDescription',
                  'introduction',
                  'sections',
                  'examples',
                  'conclusion',
                  'faqs',
                  'seoKeywordSuggestions',
                ],
              },
            },
          })
        );

        const data = parseAiJson<Record<string, unknown>>(response.text, ['seoTitle', 'introduction', 'sections']);
        if (Array.isArray(data.faqs) && data.faqs.length > 3) {
          data.faqs = data.faqs.slice(0, 3);
        }
        data.targetLengthLabel = targetLengthLabel;
        data.totalParts = 1;
        res.json({ result: data });
        return;
      }

      // Multi-part blog generation for very large word counts (> 2200 words)
      const wordsPerPart = Math.round(targetWords / partsTotal);
      const part1Resp = await callGuarded('blog', requestId, apiScope, () =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: [
            `Blog Topic: ${String(topic)}`,
            `Main Keyword: ${String(mainKeyword || topic)}`,
            `Secondary Keywords: ${String(secondaryKeywords || 'None specified')}`,
            `Target Audience: ${String(targetAudience || 'General readers')}`,
            `Writing Style: ${String(writingStyle || 'Informative')}`,
            `Total Planned Length: ${targetWords} words across ${partsTotal} ordered parts.`,
            `Write PART 1 of ${partsTotal} (approximately ${wordsPerPart} words): seoTitle, metaDescription, introduction, and the opening H2/H3 sections.`,
          ].join('\n'),
          config: {
            systemInstruction: [
              'You are an expert editorial and SEO writer for NEXORA Creator.',
              `Write in ${String(writingLanguage || 'Hindi')}.`,
              'STRICT FORMAT ISOLATION: Editorial blog format ONLY. Never include script cues, character dialogues, or timestamps.',
              'Do NOT include conclusion or FAQs in Part 1; subsequent parts will continue seamlessly.',
            ].join(' '),
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                seoTitle: { type: Type.STRING },
                metaDescription: { type: Type.STRING },
                introduction: { type: Type.STRING },
                sections: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      h2: { type: Type.STRING },
                      content: { type: Type.STRING },
                      subsections: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: { h3: { type: Type.STRING }, content: { type: Type.STRING } },
                          required: ['h3', 'content'],
                        },
                      },
                    },
                    required: ['h2', 'content', 'subsections'],
                  },
                },
              },
              required: ['seoTitle', 'metaDescription', 'introduction', 'sections'],
            },
          },
        })
      );

      const part1Data = parseAiJson<{
        seoTitle: string;
        metaDescription: string;
        introduction: string;
        sections: Array<{ h2: string; content: string; partNumber?: number; subsections: Array<{ h3: string; content: string }> }>;
      }>(part1Resp.text, ['seoTitle', 'sections']);
      const allSections = (part1Data.sections || []).map((s) => ({ ...s, partNumber: 1 }));
      const coveredHeadings = allSections.map((s) => s.h2);

      let finalExamples: string[] = [];
      let finalConclusion = '';
      let finalFaqs: Array<{ question: string; answer: string }> = [];
      let finalKeywords: string[] = [];

      for (let p = 2; p <= partsTotal; p++) {
        const isLast = p === partsTotal;
        let contResp;
        try {
          contResp = await callGuarded('blog', requestId, apiScope, () =>
            ai.models.generateContent({
            model: MODEL_NAME,
            contents: [
              `Blog Title: ${part1Data.seoTitle}`,
              `Topic: ${String(topic)} | Main Keyword: ${String(mainKeyword || topic)}`,
              `Already covered H2 headings (DO NOT repeat these): ${coveredHeadings.join(' | ')}`,
              `Write PART ${p} of ${partsTotal} (approximately ${wordsPerPart} words) continuing seamlessly in order.`,
              isLast
                ? 'Because this is the FINAL part, also provide practical examples, conclusion, EXACTLY 3 FAQs, and seoKeywordSuggestions.'
                : 'Generate the next new H2/H3 sections only.',
            ].join('\n'),
            config: {
              systemInstruction: [
                'You are an expert editorial and SEO writer for NEXORA Creator.',
                `Write in ${String(writingLanguage || 'Hindi')}.`,
                'STRICT FORMAT ISOLATION: Editorial blog format ONLY. Never include video script cues or timestamps.',
                isLast ? 'Include EXACTLY 3 FAQs.' : '',
              ]
                .filter(Boolean)
                .join(' '),
              responseMimeType: 'application/json',
              responseSchema: isLast
                ? {
                    type: Type.OBJECT,
                    properties: {
                      sections: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            h2: { type: Type.STRING },
                            content: { type: Type.STRING },
                            subsections: {
                              type: Type.ARRAY,
                              items: {
                                type: Type.OBJECT,
                                properties: { h3: { type: Type.STRING }, content: { type: Type.STRING } },
                                required: ['h3', 'content'],
                              },
                            },
                          },
                          required: ['h2', 'content', 'subsections'],
                        },
                      },
                      examples: { type: Type.ARRAY, items: { type: Type.STRING } },
                      conclusion: { type: Type.STRING },
                      faqs: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: { question: { type: Type.STRING }, answer: { type: Type.STRING } },
                          required: ['question', 'answer'],
                        },
                      },
                      seoKeywordSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ['sections', 'examples', 'conclusion', 'faqs', 'seoKeywordSuggestions'],
                  }
                : {
                    type: Type.OBJECT,
                    properties: {
                      sections: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            h2: { type: Type.STRING },
                            content: { type: Type.STRING },
                            subsections: {
                              type: Type.ARRAY,
                              items: {
                                type: Type.OBJECT,
                                properties: { h3: { type: Type.STRING }, content: { type: Type.STRING } },
                                required: ['h3', 'content'],
                              },
                            },
                          },
                          required: ['h2', 'content', 'subsections'],
                        },
                      },
                    },
                    required: ['sections'],
                  },
            },
          })
          );
        } catch (err) {
          if (err instanceof GuardedGeminiError) {
            err.partialPartsCompleted = p - 1;
          }
          throw err;
        }

        const contData = parseAiJson<{
          sections?: Array<{ h2: string; content: string; subsections: Array<{ h3: string; content: string }> }>;
          examples?: string[];
          conclusion?: string;
          faqs?: Array<{ question: string; answer: string }>;
          seoKeywordSuggestions?: string[];
        }>(contResp.text, ['sections']);
        for (const sec of contData.sections || []) {
          allSections.push({ ...sec, partNumber: p });
          coveredHeadings.push(sec.h2);
        }
        if (isLast) {
          finalExamples = contData.examples || [];
          finalConclusion = contData.conclusion || '';
          finalFaqs = (contData.faqs || []).slice(0, 3);
          finalKeywords = contData.seoKeywordSuggestions || [];
        }
      }

      res.json({
        result: {
          seoTitle: part1Data.seoTitle,
          metaDescription: part1Data.metaDescription,
          introduction: part1Data.introduction,
          sections: allSections,
          examples: finalExamples,
          conclusion: finalConclusion,
          faqs: finalFaqs,
          seoKeywordSuggestions: finalKeywords,
          targetLengthLabel,
          totalParts: partsTotal,
        },
      });
      return;
    }

    if (mode === 'shorts') {
      const {
        topic,
        category,
        language,
        tone,
        characters,
        sceneCount,
        duration,
        lengthMode,
        customDuration,
        includeNarrator,
        includeLikeSubscribe,
      } = payload as Record<string, unknown>;

      if (!String(topic ?? '').trim()) {
        res.status(400).json({ code: 'VALIDATION_ERROR', error: 'Shorts topic is required.' });
        return;
      }

      let resolvedDuration = String(duration || '30 seconds');
      let totalSeconds = parseDurationSeconds(resolvedDuration) ?? 30;
      if (lengthMode === 'custom' || (customDuration !== undefined && String(customDuration).trim() !== '')) {
        const customSec = parseDurationSeconds(String(customDuration));
        if (!customSec || customSec < 5 || customSec > 1800) {
          res.status(400).json({
            code: 'VALIDATION_ERROR',
            error: 'Custom Shorts duration must be between 5 seconds and 30 minutes (1800 seconds).',
          });
          return;
        }
        totalSeconds = customSec;
        resolvedDuration = String(customDuration).trim();
      }

      const requestedScenes = Math.max(2, Number(sceneCount) || 4);
      const targetScenesTotal =
        totalSeconds > 90
          ? Math.max(requestedScenes, Math.min(20, Math.round(totalSeconds / 15)))
          : requestedScenes;
      const partsTotal = totalSeconds > 120 ? Math.min(3, Math.ceil(totalSeconds / 120)) : 1;

      const baseSystemRules = [
        'You are a YouTube Shorts / Reel director and scriptwriter for NEXORA Creator.',
        `Write hooks, dialogues, and ending in ${String(language || 'Hindi')}. Write AI image and AI video prompts in clear descriptive English.`,
        'STRICT FORMAT ISOLATION: Output ONLY a scene-by-scene video script. NEVER write blog articles, H2/H3 essays, or FAQs.',
        `STRICT DURATION PACING: Pace dialogues and visuals accurately to fit the total target duration of ${resolvedDuration} (${totalSeconds} seconds).`,
        'STRICT DIALOGUE & VISUAL RULES:',
        '1. Each character must speak ONLY their own assigned dialogue.',
        '2. Never swap character dialogues between characters.',
        '3. Never generate overlapping dialogue (only one speaker per scene beat).',
        includeNarrator
          ? '4. A Narrator voice is allowed when needed.'
          : '4. NO narrator at all — use only the named characters.',
        '5. In every scene visualDescription and aiVideoPrompt, explicitly specify that ONLY the currently speaking character moves their mouth, while all silent characters keep their mouths closed.',
        '6. Maintain 100% consistent character clothing, age, hair, and appearance across every scene and prompt.',
      ].join('\n');

      if (partsTotal === 1) {
        const prompt = [
          `Topic: ${String(topic)}`,
          `Category: ${String(category || 'General')}`,
          `Exact Target Duration: ${resolvedDuration} (${totalSeconds} seconds)`,
          `Tone: ${String(tone || 'Engaging')}`,
          `Characters: ${String(characters || 'Aarav, Priya')}`,
          `Exact Number of Scenes: ${targetScenesTotal}`,
          `Include Like & Subscribe line: ${includeLikeSubscribe ? 'Yes' : 'No'}`,
        ].join('\n');

        const response = await callGuarded('shorts', requestId, apiScope, () =>
          ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
              systemInstruction: baseSystemRules,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  hook: { type: Type.STRING },
                  characterAppearanceGuide: { type: Type.STRING },
                  scenes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        sceneNumber: { type: Type.INTEGER },
                        durationEstimate: { type: Type.STRING },
                        speakingCharacter: { type: Type.STRING },
                        dialogue: { type: Type.STRING },
                        visualDescription: { type: Type.STRING },
                        aiImagePrompt: { type: Type.STRING },
                        aiVideoPrompt: { type: Type.STRING },
                      },
                      required: [
                        'sceneNumber',
                        'durationEstimate',
                        'speakingCharacter',
                        'dialogue',
                        'visualDescription',
                        'aiImagePrompt',
                        'aiVideoPrompt',
                      ],
                    },
                  },
                  ending: { type: Type.STRING },
                  likeSubscribeLine: { type: Type.STRING },
                },
                required: [
                  'title',
                  'hook',
                  'characterAppearanceGuide',
                  'scenes',
                  'ending',
                  'likeSubscribeLine',
                ],
              },
            },
          })
        );

        const data = parseAiJson<Record<string, unknown>>(response.text, ['title', 'scenes']);
        data.targetLengthLabel = resolvedDuration;
        data.totalParts = 1;
        res.json({ result: data });
        return;
      }

      // Multi-part Shorts script for > 2 minute custom durations
      const scenesPerPart = Math.ceil(targetScenesTotal / partsTotal);
      const part1Resp = await callGuarded('shorts', requestId, apiScope, () =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: [
            `Topic: ${String(topic)} | Category: ${String(category || 'General')} | Tone: ${String(tone || 'Engaging')}`,
            `Characters: ${String(characters || 'Aarav, Priya')}`,
            `Total Target Duration: ${resolvedDuration} (${totalSeconds} seconds) divided into ${partsTotal} ordered parts.`,
            `Write PART 1 of ${partsTotal}: title, hook, characterAppearanceGuide, and Scenes 1 to ${scenesPerPart}.`,
          ].join('\n'),
          config: {
            systemInstruction: baseSystemRules,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                hook: { type: Type.STRING },
                characterAppearanceGuide: { type: Type.STRING },
                scenes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      sceneNumber: { type: Type.INTEGER },
                      durationEstimate: { type: Type.STRING },
                      speakingCharacter: { type: Type.STRING },
                      dialogue: { type: Type.STRING },
                      visualDescription: { type: Type.STRING },
                      aiImagePrompt: { type: Type.STRING },
                      aiVideoPrompt: { type: Type.STRING },
                    },
                    required: [
                      'sceneNumber',
                      'durationEstimate',
                      'speakingCharacter',
                      'dialogue',
                      'visualDescription',
                      'aiImagePrompt',
                      'aiVideoPrompt',
                    ],
                  },
                },
              },
              required: ['title', 'hook', 'characterAppearanceGuide', 'scenes'],
            },
          },
        })
      );

      const part1Data = parseAiJson<{
        title: string;
        hook: string;
        characterAppearanceGuide: string;
        scenes: Array<Record<string, unknown>>;
      }>(part1Resp.text, ['title', 'scenes']);

      const allScenes: Array<Record<string, unknown>> = (part1Data.scenes || []).map((s, idx) => ({
        ...s,
        sceneNumber: idx + 1,
        partNumber: 1,
      }));
      let finalEnding = '';
      let finalLikeSub = '';

      for (let p = 2; p <= partsTotal; p++) {
        const isLast = p === partsTotal;
        const startSceneNum = allScenes.length + 1;
        const endSceneNum = isLast ? targetScenesTotal : startSceneNum + scenesPerPart - 1;
        const lastScene = allScenes[allScenes.length - 1];

        let contResp;
        try {
          contResp = await callGuarded('shorts', requestId, apiScope, () =>
            ai.models.generateContent({
            model: MODEL_NAME,
            contents: [
              `Script Title: ${part1Data.title}`,
              `Character Appearance Guide (MUST MATCH): ${part1Data.characterAppearanceGuide}`,
              `Previous Scene Context: ${lastScene ? String(lastScene.dialogue || '') : ''}`,
              `Write PART ${p} of ${partsTotal}: Scenes ${startSceneNum} to ${endSceneNum} continuing seamlessly.`,
              isLast
                ? `Also include ending and ${includeLikeSubscribe ? 'a clear Like & Subscribe line' : 'empty string for likeSubscribeLine'}.`
                : 'Continue scenes only.',
            ].join('\n'),
            config: {
              systemInstruction: baseSystemRules,
              responseMimeType: 'application/json',
              responseSchema: isLast
                ? {
                    type: Type.OBJECT,
                    properties: {
                      scenes: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            sceneNumber: { type: Type.INTEGER },
                            durationEstimate: { type: Type.STRING },
                            speakingCharacter: { type: Type.STRING },
                            dialogue: { type: Type.STRING },
                            visualDescription: { type: Type.STRING },
                            aiImagePrompt: { type: Type.STRING },
                            aiVideoPrompt: { type: Type.STRING },
                          },
                          required: [
                            'sceneNumber',
                            'durationEstimate',
                            'speakingCharacter',
                            'dialogue',
                            'visualDescription',
                            'aiImagePrompt',
                            'aiVideoPrompt',
                          ],
                        },
                      },
                      ending: { type: Type.STRING },
                      likeSubscribeLine: { type: Type.STRING },
                    },
                    required: ['scenes', 'ending', 'likeSubscribeLine'],
                  }
                : {
                    type: Type.OBJECT,
                    properties: {
                      scenes: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            sceneNumber: { type: Type.INTEGER },
                            durationEstimate: { type: Type.STRING },
                            speakingCharacter: { type: Type.STRING },
                            dialogue: { type: Type.STRING },
                            visualDescription: { type: Type.STRING },
                            aiImagePrompt: { type: Type.STRING },
                            aiVideoPrompt: { type: Type.STRING },
                          },
                          required: [
                            'sceneNumber',
                            'durationEstimate',
                            'speakingCharacter',
                            'dialogue',
                            'visualDescription',
                            'aiImagePrompt',
                            'aiVideoPrompt',
                          ],
                        },
                      },
                    },
                    required: ['scenes'],
                  },
            },
          })
          );
        } catch (err) {
          if (err instanceof GuardedGeminiError) {
            err.partialPartsCompleted = p - 1;
          }
          throw err;
        }

        const contData = parseAiJson<{
          scenes?: Array<Record<string, unknown>>;
          ending?: string;
          likeSubscribeLine?: string;
        }>(contResp.text, ['scenes']);
        for (const sc of contData.scenes || []) {
          allScenes.push({
            ...sc,
            sceneNumber: allScenes.length + 1,
            partNumber: p,
          });
        }
        if (isLast) {
          finalEnding = contData.ending || '';
          finalLikeSub = contData.likeSubscribeLine || '';
        }
      }

      res.json({
        result: {
          title: part1Data.title,
          hook: part1Data.hook,
          characterAppearanceGuide: part1Data.characterAppearanceGuide,
          scenes: allScenes,
          ending: finalEnding,
          likeSubscribeLine: finalLikeSub,
          targetLengthLabel: resolvedDuration,
          totalParts: partsTotal,
        },
      });
      return;
    }

    if (mode === 'long_video') {
      const {
        topic,
        duration,
        lengthMode,
        customDurationMinutes,
        format,
        language,
        deliveryMode,
        audience,
        tone,
      } = payload as Record<string, unknown>;

      if (!String(topic ?? '').trim()) {
        res.status(400).json({ code: 'VALIDATION_ERROR', error: 'Video topic is required.' });
        return;
      }

      let totalMinutes = parseDurationMinutes(String(duration || '10 minutes')) ?? 10;
      if (lengthMode === 'custom' || (customDurationMinutes !== undefined && String(customDurationMinutes).trim() !== '')) {
        const parsedCustom = parsePositiveInt(customDurationMinutes);
        if (!parsedCustom || parsedCustom < 1 || parsedCustom > 240) {
          res.status(400).json({
            code: 'VALIDATION_ERROR',
            error: 'Custom long video duration must be between 1 and 240 minutes.',
          });
          return;
        }
        totalMinutes = parsedCustom;
      }

      const resolvedDurationLabel = `${totalMinutes} ${totalMinutes === 1 ? 'minute' : 'minutes'}`;
      const partsTotal = totalMinutes > 25 ? Math.min(4, Math.ceil(totalMinutes / 30)) : 1;

      const baseSystem = [
        'You are an experienced long-form YouTube scriptwriter for NEXORA Creator.',
        `Write the entire script in ${String(language || 'Hindi')}.`,
        'STRICT FORMAT ISOLATION: Output ONLY a spoken YouTube video script with timestamps, scene suggestions, and transitions. NEVER write blog H2/H3 essays or FAQs.',
        `Match pacing, spoken depth, and section count accurately for a ${resolvedDurationLabel} video in ${String(format || 'Educational')} format.`,
        `Delivery style: ${String(deliveryMode || 'Host Narration')}.`,
      ].join(' ');

      if (partsTotal === 1) {
        const prompt = [
          `Topic: ${String(topic)}`,
          `Exact Target Duration: ${resolvedDurationLabel}`,
          `Format: ${String(format || 'Educational')}`,
          `Delivery Mode: ${String(deliveryMode || 'Host Narration')}`,
          `Target Audience: ${String(audience || 'YouTube viewers')}`,
          `Tone: ${String(tone || 'Informative and engaging')}`,
        ].join('\n');

        const response = await callGuarded('long_video', requestId, apiScope, () =>
          ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
              systemInstruction: baseSystem,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  videoTitle: { type: Type.STRING },
                  openingHook: { type: Type.STRING },
                  introduction: { type: Type.STRING },
                  sections: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        timestamp: { type: Type.STRING },
                        sectionTitle: { type: Type.STRING },
                        scriptContent: { type: Type.STRING },
                        sceneSuggestion: { type: Type.STRING },
                        transition: { type: Type.STRING },
                      },
                      required: ['timestamp', 'sectionTitle', 'scriptContent', 'sceneSuggestion', 'transition'],
                    },
                  },
                  conclusion: { type: Type.STRING },
                  viewerCta: { type: Type.STRING },
                },
                required: ['videoTitle', 'openingHook', 'introduction', 'sections', 'conclusion', 'viewerCta'],
              },
            },
          })
        );

        const data = parseAiJson<Record<string, unknown>>(response.text, ['videoTitle', 'sections']);
        data.targetLengthLabel = resolvedDurationLabel;
        data.totalParts = 1;
        res.json({ result: data });
        return;
      }

      // Multi-part sequential script generation for long durations (> 25 minutes, e.g., 60 or 120 min)
      const minsPerPart = totalMinutes / partsTotal;
      const part1End = formatClock(minsPerPart);

      const part1Resp = await callGuarded('long_video', requestId, apiScope, () =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: [
            `Topic: ${String(topic)} | Format: ${String(format || 'Educational')} | Delivery: ${String(deliveryMode || 'Host Narration')}`,
            `Target Audience: ${String(audience || 'YouTube viewers')} | Tone: ${String(tone || 'Informative')}`,
            `Total Video Duration: ${resolvedDurationLabel} split into ${partsTotal} chronological parts.`,
            `Write PART 1 of ${partsTotal} covering timestamps 00:00 to ${part1End}: videoTitle, openingHook, introduction, and 3-5 detailed script sections for this time window.`,
          ].join('\n'),
          config: {
            systemInstruction: baseSystem,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                videoTitle: { type: Type.STRING },
                openingHook: { type: Type.STRING },
                introduction: { type: Type.STRING },
                sections: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      timestamp: { type: Type.STRING },
                      sectionTitle: { type: Type.STRING },
                      scriptContent: { type: Type.STRING },
                      sceneSuggestion: { type: Type.STRING },
                      transition: { type: Type.STRING },
                    },
                    required: ['timestamp', 'sectionTitle', 'scriptContent', 'sceneSuggestion', 'transition'],
                  },
                },
              },
              required: ['videoTitle', 'openingHook', 'introduction', 'sections'],
            },
          },
        })
      );

      const part1Data = parseAiJson<{
        videoTitle: string;
        openingHook: string;
        introduction: string;
        sections: Array<{
          timestamp: string;
          partNumber?: number;
          sectionTitle: string;
          scriptContent: string;
          sceneSuggestion: string;
          transition: string;
        }>;
      }>(part1Resp.text, ['videoTitle', 'sections']);

      const allSections = (part1Data.sections || []).map((s) => ({ ...s, partNumber: 1 }));
      const coveredTitles = allSections.map((s) => s.sectionTitle);
      let finalConclusion = '';
      let finalCta = '';

      for (let p = 2; p <= partsTotal; p++) {
        const isLast = p === partsTotal;
        const startTime = formatClock(minsPerPart * (p - 1));
        const endTime = formatClock(isLast ? totalMinutes : minsPerPart * p);

        let contResp;
        try {
          contResp = await callGuarded('long_video', requestId, apiScope, () =>
            ai.models.generateContent({
            model: MODEL_NAME,
            contents: [
              `Video Title: ${part1Data.videoTitle}`,
              `Topic: ${String(topic)} | Total Duration: ${resolvedDurationLabel}`,
              `Previously Covered Sections (DO NOT repeat): ${coveredTitles.join(' | ')}`,
              `Write PART ${p} of ${partsTotal} covering timestamps ${startTime} to ${endTime} with 3-5 detailed sequential sections.`,
              isLast ? 'Since this is the FINAL part, also write conclusion and viewerCta.' : 'Write continuation sections only.',
            ].join('\n'),
            config: {
              systemInstruction: baseSystem,
              responseMimeType: 'application/json',
              responseSchema: isLast
                ? {
                    type: Type.OBJECT,
                    properties: {
                      sections: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            timestamp: { type: Type.STRING },
                            sectionTitle: { type: Type.STRING },
                            scriptContent: { type: Type.STRING },
                            sceneSuggestion: { type: Type.STRING },
                            transition: { type: Type.STRING },
                          },
                          required: ['timestamp', 'sectionTitle', 'scriptContent', 'sceneSuggestion', 'transition'],
                        },
                      },
                      conclusion: { type: Type.STRING },
                      viewerCta: { type: Type.STRING },
                    },
                    required: ['sections', 'conclusion', 'viewerCta'],
                  }
                : {
                    type: Type.OBJECT,
                    properties: {
                      sections: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            timestamp: { type: Type.STRING },
                            sectionTitle: { type: Type.STRING },
                            scriptContent: { type: Type.STRING },
                            sceneSuggestion: { type: Type.STRING },
                            transition: { type: Type.STRING },
                          },
                          required: ['timestamp', 'sectionTitle', 'scriptContent', 'sceneSuggestion', 'transition'],
                        },
                      },
                    },
                    required: ['sections'],
                  },
            },
          })
          );
        } catch (err) {
          if (err instanceof GuardedGeminiError) {
            err.partialPartsCompleted = p - 1;
          }
          throw err;
        }

        const contData = parseAiJson<{
          sections?: Array<{
            timestamp: string;
            sectionTitle: string;
            scriptContent: string;
            sceneSuggestion: string;
            transition: string;
          }>;
          conclusion?: string;
          viewerCta?: string;
        }>(contResp.text, ['sections']);

        for (const sec of contData.sections || []) {
          allSections.push({ ...sec, partNumber: p });
          coveredTitles.push(sec.sectionTitle);
        }
        if (isLast) {
          finalConclusion = contData.conclusion || '';
          finalCta = contData.viewerCta || '';
        }
      }

      res.json({
        result: {
          videoTitle: part1Data.videoTitle,
          openingHook: part1Data.openingHook,
          introduction: part1Data.introduction,
          sections: allSections,
          conclusion: finalConclusion,
          viewerCta: finalCta,
          targetLengthLabel: resolvedDurationLabel,
          totalParts: partsTotal,
        },
      });
      return;
    }

    if (mode === 'social') {
      const {
        contentType,
        tone,
        language,
        topic,
        details,
        includeCta,
        lengthPreset,
        lengthMode,
        customLengthValue,
        customLengthUnit,
      } = payload as Record<string, unknown>;

      if (!String(topic ?? '').trim()) {
        res.status(400).json({ code: 'VALIDATION_ERROR', error: 'Topic or product name is required.' });
        return;
      }

      const presetMap: Record<string, string> = {
        'Very Short': 'Very Short (strictly 20–35 words)',
        Short: 'Short (strictly 55–85 words)',
        Medium: 'Medium (strictly 120–170 words)',
        Detailed: 'Detailed (strictly 250–350 words)',
      };

      let targetLengthLabel = presetMap[String(lengthPreset || 'Medium')] || presetMap.Medium;

      if (lengthMode === 'custom' || (customLengthValue !== undefined && String(customLengthValue).trim() !== '')) {
        const val = parsePositiveInt(customLengthValue);
        const unit = customLengthUnit === 'characters' ? 'characters' : 'words';
        if (!val) {
          res.status(400).json({ code: 'VALIDATION_ERROR', error: 'Custom social media length must be a positive whole number.' });
          return;
        }
        if (unit === 'words' && (val < 10 || val > 1500)) {
          res.status(400).json({ code: 'VALIDATION_ERROR', error: 'Custom word count must be between 10 and 1500 words.' });
          return;
        }
        if (unit === 'characters' && (val < 30 || val > 5000)) {
          res.status(400).json({ code: 'VALIDATION_ERROR', error: 'Custom character count must be between 30 and 5000 characters.' });
          return;
        }
        targetLengthLabel = `${val} ${unit}`;
      }

      const systemInstruction = [
        'You are a brand strategist and social media copywriter for NEXORA Creator.',
        `Write in ${String(language || 'Hindi')} using a ${String(tone || 'Professional')} tone.`,
        `STRICT LENGTH TARGET: Make primaryContent match ${targetLengthLabel}.`,
        'Create original, authentic, scroll-stopping social content ready to publish.',
      ].join(' ');

      const prompt = [
        `Content Type: ${String(contentType || 'Instagram captions')}`,
        `Tone: ${String(tone || 'Professional')}`,
        `Target Length: ${targetLengthLabel}`,
        `Topic / Product / Announcement: ${String(topic)}`,
        `Additional Details: ${String(details || 'None')}`,
        `Include Call-to-Action: ${includeCta ? 'Yes' : 'No'}`,
      ].join('\n');

      const response = await callGuarded('social', requestId, apiScope, () =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                headlineOrHook: { type: Type.STRING },
                primaryContent: { type: Type.STRING },
                alternativeVersions: { type: Type.ARRAY, items: { type: Type.STRING } },
                hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                ctaLine: { type: Type.STRING },
              },
              required: ['headlineOrHook', 'primaryContent', 'alternativeVersions', 'hashtags', 'ctaLine'],
            },
          },
        })
      );

      const data = parseAiJson<Record<string, unknown>>(response.text, ['headlineOrHook', 'primaryContent']);
      data.targetLengthLabel = targetLengthLabel;
      res.json({ result: data });
      return;
    }

    if (mode === 'story') {
      const {
        premise,
        genre,
        sceneCount,
        language,
        tone,
        characters,
        lengthPreset,
        lengthMode,
        customWordCount,
      } = payload as {
        premise: string;
        genre: string;
        sceneCount: number;
        language: string;
        tone: string;
        lengthPreset?: string;
        lengthMode?: string;
        customWordCount?: string | number;
        characters: Array<{ name: string; role: string; personality: string; appearance: string; voiceStyle: string }>;
      };

      if (!premise?.trim()) {
        res.status(400).json({ code: 'VALIDATION_ERROR', error: 'Story premise is required.' });
        return;
      }

      const storyPresetMap: Record<string, number> = {
        Short: 450,
        Medium: 900,
        Long: 1800,
      };
      let targetWords = storyPresetMap[String(lengthPreset || 'Medium')] ?? 900;

      if (lengthMode === 'custom' || (customWordCount !== undefined && String(customWordCount).trim() !== '')) {
        const parsedCustom = parsePositiveInt(customWordCount);
        if (!parsedCustom || parsedCustom < 150 || parsedCustom > 10000) {
          res.status(400).json({
            code: 'VALIDATION_ERROR',
            error: 'Custom story word count must be a whole number between 150 and 10000 words.',
          });
          return;
        }
        targetWords = parsedCustom;
      }

      const targetLengthLabel = `${targetWords} words`;
      const partsTotal = targetWords > 2200 ? Math.min(4, Math.ceil(targetWords / 2000)) : 1;
      const totalScenes = Math.max(Number(sceneCount) || 4, partsTotal > 1 ? partsTotal * 3 : Number(sceneCount) || 4);

      const charList =
        Array.isArray(characters) && characters.length > 0
          ? characters
              .map(
                (c, idx) =>
                  `${idx + 1}. Name: ${c.name} | Role: ${c.role} | Personality: ${c.personality} | Appearance: ${c.appearance} | Speaking Style: ${c.voiceStyle}`
              )
              .join('\n')
          : 'Create 2 original named characters with consistent appearance.';

      const baseSystem = [
        'You are a story architect and visual director for NEXORA Creator.',
        `Write story title, narrative, dialogues, and ending in ${language || 'Hindi'}.`,
        'Write aiImagePrompt and aiVideoPrompt in clear English embedding the EXACT consistent physical appearance & clothing of every character present in each scene.',
        'STRICT FORMAT ISOLATION: Write narrative prose + character dialogues per scene. NEVER use blog H2/FAQ format.',
        'STRICT RULES:',
        '- Preserve exact character personalities and physical descriptions across all scenes.',
        '- Assign every spoken line strictly to a specific named character; never swap or overlap dialogue.',
        '- In aiVideoPrompt, specify that only the speaking character moves their mouth while silent characters keep their mouths closed.',
      ].join('\n');

      if (partsTotal === 1) {
        const prompt = [
          `Story Premise: ${premise}`,
          `Genre: ${genre || 'Drama'}`,
          `Tone: ${tone || 'Engaging'}`,
          `Target Total Word Count: approximately ${targetWords} words across all scenes and ending.`,
          `Exact Number of Scenes: ${totalScenes}`,
          'Characters to use:',
          charList,
        ].join('\n');

        const response = await callGuarded('story', requestId, apiScope, () =>
          ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
              systemInstruction: baseSystem,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  storyTitle: { type: Type.STRING },
                  characterReferenceSummary: { type: Type.STRING },
                  scenes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        sceneNumber: { type: Type.INTEGER },
                        locationAndMood: { type: Type.STRING },
                        narrative: { type: Type.STRING },
                        dialogues: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              characterName: { type: Type.STRING },
                              line: { type: Type.STRING },
                            },
                            required: ['characterName', 'line'],
                          },
                        },
                        aiImagePrompt: { type: Type.STRING },
                        aiVideoPrompt: { type: Type.STRING },
                      },
                      required: [
                        'sceneNumber',
                        'locationAndMood',
                        'narrative',
                        'dialogues',
                        'aiImagePrompt',
                        'aiVideoPrompt',
                      ],
                    },
                  },
                  ending: { type: Type.STRING },
                },
                required: ['storyTitle', 'characterReferenceSummary', 'scenes', 'ending'],
              },
            },
          })
        );

        const data = parseAiJson<Record<string, unknown>>(response.text, ['storyTitle', 'scenes']);
        data.targetLengthLabel = targetLengthLabel;
        data.totalParts = 1;
        res.json({ result: data });
        return;
      }

      // Multi-part sequential story generation for > 2200 words
      const scenesPerPart = Math.ceil(totalScenes / partsTotal);
      const wordsPerPart = Math.round(targetWords / partsTotal);

      const part1Resp = await callGuarded('story', requestId, apiScope, () =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: [
            `Story Premise: ${premise} | Genre: ${genre || 'Drama'} | Tone: ${tone || 'Engaging'}`,
            `Total Story Target: ${targetWords} words across ${partsTotal} sequential parts.`,
            'Characters:',
            charList,
            `Write PART 1 of ${partsTotal} (~${wordsPerPart} words): storyTitle, characterReferenceSummary, and Scenes 1 to ${scenesPerPart}.`,
          ].join('\n'),
          config: {
            systemInstruction: baseSystem,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                storyTitle: { type: Type.STRING },
                characterReferenceSummary: { type: Type.STRING },
                scenes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      sceneNumber: { type: Type.INTEGER },
                      locationAndMood: { type: Type.STRING },
                      narrative: { type: Type.STRING },
                      dialogues: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: { characterName: { type: Type.STRING }, line: { type: Type.STRING } },
                          required: ['characterName', 'line'],
                        },
                      },
                      aiImagePrompt: { type: Type.STRING },
                      aiVideoPrompt: { type: Type.STRING },
                    },
                    required: ['sceneNumber', 'locationAndMood', 'narrative', 'dialogues', 'aiImagePrompt', 'aiVideoPrompt'],
                  },
                },
              },
              required: ['storyTitle', 'characterReferenceSummary', 'scenes'],
            },
          },
        })
      );

      const part1Data = parseAiJson<{
        storyTitle: string;
        characterReferenceSummary: string;
        scenes: Array<Record<string, unknown>>;
      }>(part1Resp.text, ['storyTitle', 'scenes']);

      const allScenes: Array<Record<string, unknown>> = (part1Data.scenes || []).map((s, idx) => ({
        ...s,
        sceneNumber: idx + 1,
        partNumber: 1,
      }));
      let finalEnding = '';

      for (let p = 2; p <= partsTotal; p++) {
        const isLast = p === partsTotal;
        const startSceneNum = allScenes.length + 1;
        const endSceneNum = isLast ? totalScenes : startSceneNum + scenesPerPart - 1;
        const prevScene = allScenes[allScenes.length - 1];

        let contResp;
        try {
          contResp = await callGuarded('story', requestId, apiScope, () =>
            ai.models.generateContent({
            model: MODEL_NAME,
            contents: [
              `Story Title: ${part1Data.storyTitle}`,
              `Character Reference Summary (MUST MAINTAIN): ${part1Data.characterReferenceSummary}`,
              `Previous Scene Ending Context: ${prevScene ? String(prevScene.narrative || '') : ''}`,
              `Write PART ${p} of ${partsTotal} (~${wordsPerPart} words): Scenes ${startSceneNum} to ${endSceneNum} continuing seamlessly.`,
              isLast ? 'Since this is the FINAL part, also provide the story ending.' : 'Write continuation scenes only.',
            ].join('\n'),
            config: {
              systemInstruction: baseSystem,
              responseMimeType: 'application/json',
              responseSchema: isLast
                ? {
                    type: Type.OBJECT,
                    properties: {
                      scenes: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            sceneNumber: { type: Type.INTEGER },
                            locationAndMood: { type: Type.STRING },
                            narrative: { type: Type.STRING },
                            dialogues: {
                              type: Type.ARRAY,
                              items: {
                                type: Type.OBJECT,
                                properties: { characterName: { type: Type.STRING }, line: { type: Type.STRING } },
                                required: ['characterName', 'line'],
                              },
                            },
                            aiImagePrompt: { type: Type.STRING },
                            aiVideoPrompt: { type: Type.STRING },
                          },
                          required: ['sceneNumber', 'locationAndMood', 'narrative', 'dialogues', 'aiImagePrompt', 'aiVideoPrompt'],
                        },
                      },
                      ending: { type: Type.STRING },
                    },
                    required: ['scenes', 'ending'],
                  }
                : {
                    type: Type.OBJECT,
                    properties: {
                      scenes: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            sceneNumber: { type: Type.INTEGER },
                            locationAndMood: { type: Type.STRING },
                            narrative: { type: Type.STRING },
                            dialogues: {
                              type: Type.ARRAY,
                              items: {
                                type: Type.OBJECT,
                                properties: { characterName: { type: Type.STRING }, line: { type: Type.STRING } },
                                required: ['characterName', 'line'],
                              },
                            },
                            aiImagePrompt: { type: Type.STRING },
                            aiVideoPrompt: { type: Type.STRING },
                          },
                          required: ['sceneNumber', 'locationAndMood', 'narrative', 'dialogues', 'aiImagePrompt', 'aiVideoPrompt'],
                        },
                      },
                    },
                    required: ['scenes'],
                  },
            },
          })
          );
        } catch (err) {
          if (err instanceof GuardedGeminiError) {
            err.partialPartsCompleted = p - 1;
          }
          throw err;
        }

        const contData = parseAiJson<{
          scenes?: Array<Record<string, unknown>>;
          ending?: string;
        }>(contResp.text, ['scenes']);
        for (const sc of contData.scenes || []) {
          allScenes.push({
            ...sc,
            sceneNumber: allScenes.length + 1,
            partNumber: p,
          });
        }
        if (isLast) {
          finalEnding = contData.ending || '';
        }
      }

      res.json({
        result: {
          storyTitle: part1Data.storyTitle,
          characterReferenceSummary: part1Data.characterReferenceSummary,
          scenes: allScenes,
          ending: finalEnding,
          targetLengthLabel,
          totalParts: partsTotal,
        },
      });
      return;
    }

    if (mode === 'prompt') {
      const { idea, category, style, aspectRatio, outputLanguage } = payload as Record<string, string>;
      if (!idea?.trim()) {
        res.status(400).json({ code: 'VALIDATION_ERROR', error: 'Simple idea is required.' });
        return;
      }

      const systemInstruction = [
        'You are a precision prompt engineer for NEXORA Creator.',
        `Expand the user's simple idea into a comprehensive, highly organized prompt in ${outputLanguage || 'English'}.`,
        'Include rich visual/contextual specificity, composition or instruction structure, constraints to avoid, and 2 creative variations.',
      ].join(' ');

      const prompt = [
        `Simple Idea: ${idea}`,
        `Prompt Category: ${category || 'Image generation prompts'}`,
        `Preferred Style / Mood: ${style || 'Cinematic, sharp, high detail'}`,
        `Technical Specs / Aspect Ratio: ${aspectRatio || 'Default / Auto'}`,
      ].join('\n');

      const response = await callGuarded('prompt', requestId, apiScope, () =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                mainPrompt: { type: Type.STRING },
                technicalAndLightingNotes: { type: Type.STRING },
                negativeOrAvoid: { type: Type.STRING },
                variations: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['title', 'mainPrompt', 'technicalAndLightingNotes', 'negativeOrAvoid', 'variations'],
            },
          },
        })
      );

      res.json({ result: parseAiJson(response.text, ['title', 'mainPrompt']) });
      return;
    }

    if (mode === 'transform') {
      const { action, text, language, instruction } = payload as Record<string, string>;
      if (!text?.trim()) {
        res.status(400).json({ code: 'VALIDATION_ERROR', error: 'Content text is required for editing actions.' });
        return;
      }

      const actionMap: Record<string, string> = {
        improve: 'Improve writing clarity, grammar, flow, and natural engagement while preserving original meaning and structure.',
        readability: 'Improve readability with shorter sentences, clearer transitions, and scannable formatting while preserving all key facts.',
        expand: 'Expand this content with richer detail, helpful examples, and deeper explanations without adding fluff.',
        summarize: 'Summarize this content clearly, capturing all core points concisely.',
        shorten: 'Shorten this paragraph/content while keeping the essential message intact and punchy.',
        rewrite: 'Rewrite this paragraph/content freshly with stronger wording while preserving the exact core message.',
        regenerate: 'Create a fresh, improved regeneration of this content based on its topic and intent.',
      };

      const taskInstruction = actionMap[action] || actionMap.improve;
      const systemInstruction = [
        'You are an expert editor at NEXORA Creator.',
        taskInstruction,
        language ? `Write the output in ${language}.` : 'Keep the same language as the input text.',
        instruction ? `Extra guidance: ${instruction}` : '',
        'Return only the revised text directly without conversational preamble.',
      ]
        .filter(Boolean)
        .join(' ');

      const response = await callGuarded('transform', requestId, apiScope, () =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: text,
          config: {
            systemInstruction,
          },
        })
      );

      const revised = (response.text ?? '').trim();
      if (!revised) {
        throw Object.assign(new Error('Gemini returned empty text during editing.'), {
          code: 'INVALID_AI_OUTPUT',
        });
      }
      res.json({ result: { text: revised } });
      return;
    }

    res.status(400).json({ code: 'UNKNOWN_MODE', error: `Unsupported generation mode: ${String(mode)}` });
  } catch (err) {
    if (err instanceof GuardedGeminiError) {
      if (err.retryAfterSeconds) {
        res.setHeader('Retry-After', String(err.retryAfterSeconds));
      }
      res.status(err.status).json({
        code: err.code,
        scope: err.scope,
        module: err.module || moduleName,
        retryAfterSeconds: err.retryAfterSeconds,
        partialPartsCompleted: err.partialPartsCompleted,
        error: err.message,
      });
      return;
    }
    const classified = classifyGeminiError(err, apiScope, MODEL_NAME);
    logServerAiEvent({
      timestamp: new Date().toISOString(),
      requestId,
      module: moduleName,
      scope: apiScope,
      model: MODEL_NAME,
      event: classified.isQuotaExhausted
        ? 'quota_exhausted'
        : classified.isRateLimit
        ? 'rate_limited'
        : 'error',
      attempt: 1,
      statusCode: classified.status,
      errorCode: classified.code,
      retryAfterSeconds: classified.retryAfterSeconds,
      message: classified.message,
    });
    if (classified.retryAfterSeconds) {
      res.setHeader('Retry-After', String(classified.retryAfterSeconds));
    }
    res.status(classified.status).json({
      code: classified.code,
      scope: apiScope,
      module: moduleName,
      retryAfterSeconds: classified.retryAfterSeconds,
      error: classified.message,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NEXORA Creator server listening on http://localhost:${PORT}`);
  });
}
export { app };
startServer().catch((err) => {
  console.error('Failed to start NEXORA server:', err);
  process.exit(1);
});
