import { AIRequestError, ApiScope } from '../services/aiClient';
import { UILanguage } from '../types/nexora';

export type NexoraModuleId =
  | 'blog'
  | 'shorts'
  | 'long_video'
  | 'social'
  | 'story'
  | 'prompts'
  | 'editor'
  | 'image';

export interface FormattedModuleError {
  title: string;
  message: string;
  hint?: string;
}

const MODULE_LABELS: Record<NexoraModuleId, { hi: string; en: string; actionHi: string; actionEn: string }> = {
  blog: {
    hi: 'AI ब्लॉग राइटर',
    en: 'AI Blog Writer',
    actionHi: 'नया ब्लॉग लेख तैयार करने',
    actionEn: 'generating a new blog article',
  },
  shorts: {
    hi: 'YouTube शॉर्ट्स स्क्रिप्ट राइटर',
    en: 'YouTube Shorts Writer',
    actionHi: 'शॉर्ट्स सीन स्क्रिप्ट बनाने',
    actionEn: 'generating your Shorts script',
  },
  long_video: {
    hi: 'लॉन्ग वीडियो स्क्रिप्ट राइटर',
    en: 'Long Video Writer',
    actionHi: 'लॉन्ग वीडियो स्क्रिप्ट तैयार करने',
    actionEn: 'generating your long-form video script',
  },
  social: {
    hi: 'सोशल मीडिया क्रिएटर',
    en: 'Social Media Creator',
    actionHi: 'सोशल मीडिया पोस्ट व कैप्शन बनाने',
    actionEn: 'creating social media copy',
  },
  story: {
    hi: 'स्टोरी व कैरेक्टर स्टूडियो',
    en: 'Story & Character Studio',
    actionHi: 'कहानी और पात्र दृश्य बनाने',
    actionEn: 'generating your story scenes',
  },
  prompts: {
    hi: 'AI प्रॉम्प्ट जनरेटर',
    en: 'AI Prompt Generator',
    actionHi: 'विस्तृत AI प्रॉम्प्ट तैयार करने',
    actionEn: 'crafting your structured AI prompt',
  },
  editor: {
    hi: 'कंटेंट एडिटर',
    en: 'Content Editor',
    actionHi: 'कंटेंट सुधारने या रीराइट करने',
    actionEn: 'improving or rewriting your draft',
  },
  image: {
    hi: 'इमेज जनरेशन टूल',
    en: 'Image Generation Tool',
    actionHi: 'AI इमेज बनाने',
    actionEn: 'generating AI images',
  },
};

function getScopeLabel(scope: ApiScope, lang: UILanguage): string {
  if (scope === 'image') {
    return lang === 'hi' ? 'इमेज जनरेशन (Image Generation)' : 'Image Generation';
  }
  return lang === 'hi' ? 'टेक्स्ट जनरेशन (Text Generation)' : 'Text Generation';
}

export function formatModuleError(
  err: unknown,
  moduleId: NexoraModuleId,
  lang: UILanguage,
  hasExistingContent = false
): FormattedModuleError {
  const mod = MODULE_LABELS[moduleId];
  const modTitle = lang === 'hi' ? mod.hi : mod.en;
  const actionPhrase = lang === 'hi' ? mod.actionHi : mod.actionEn;

  const isAiErr = err instanceof AIRequestError;
  const code = isAiErr ? err.code : 'GENERATION_FAILED';
  const status = isAiErr ? err.status : 500;
  const scope: ApiScope = isAiErr ? err.scope : moduleId === 'image' ? 'image' : 'text';
  const waitSec = isAiErr && err.retryAfterSeconds ? err.retryAfterSeconds : undefined;
  const partialParts = isAiErr ? err.partialPartsCompleted : undefined;
  const scopeLabel = getScopeLabel(scope, lang);

  const preservedNote = hasExistingContent
    ? lang === 'hi'
      ? 'आपका पहले से तैयार किया गया कंटेंट पूरी तरह सुरक्षित रखा गया है।'
      : 'Your previously generated content remains safely preserved.'
    : undefined;

  const partialNote =
    partialParts && partialParts > 0
      ? lang === 'hi'
        ? `मल्टी-पार्ट प्रक्रिया भाग ${partialParts} के बाद रुक गई, इसलिए अधूरा परिणाम लागू नहीं किया गया।`
        : `Multi-part generation stopped after part ${partialParts}; incomplete output was not applied.`
      : undefined;

  // 1. Quota exhausted (HTTP 429 / RESOURCE_EXHAUSTED)
  if (code === 'QUOTA_EXHAUSTED') {
    return {
      title: lang === 'hi' ? `${modTitle} — कोटा समाप्त (429 RESOURCE_EXHAUSTED)` : `${modTitle} — Quota Exhausted (429 RESOURCE_EXHAUSTED)`,
      message:
        lang === 'hi'
          ? `${scopeLabel} के लिए Gemini API कोटा अभी समाप्त हो गया है। ${actionPhrase} के लिए कृपया कोटा फिर से उपलब्ध होने तक इंतजार करें।`
          : `Your Gemini API quota for ${scopeLabel} is currently exhausted. Please wait until quota becomes available before ${actionPhrase}.`,
      hint: [
        waitSec
          ? lang === 'hi'
            ? `सुझावित प्रतीक्षा समय: लगभग ${waitSec} सेकंड या कोटा रीसेट होने तक।`
            : `Suggested wait: at least ${waitSec} seconds or until quota resets.`
          : lang === 'hi'
          ? 'कोटा स्वतः उपलब्ध होने के बाद फिर से प्रयास करें।'
          : 'Please retry once your free/assigned quota refreshes.',
        partialNote,
        preservedNote,
      ]
        .filter(Boolean)
        .join(' '),
    };
  }

  // 2. Transient Rate Limit (429 / Queue / Local RPM / Client cooldown)
  if (
    status === 429 ||
    code === 'RATE_LIMIT_EXCEEDED' ||
    code === 'LOCAL_RATE_LIMIT' ||
    code === 'QUEUE_OVERLOADED' ||
    code === 'CLIENT_REQUEST_IN_PROGRESS'
  ) {
    const sec = waitSec ?? 15;
    if (code === 'CLIENT_REQUEST_IN_PROGRESS') {
      return {
        title: lang === 'hi' ? `${modTitle} — अनुरोध पहले से जारी है` : `${modTitle} — Request Already Running`,
        message:
          lang === 'hi'
            ? `${modTitle} में एक अनुरोध पहले से प्रोसेस हो रहा है। दोहराव रोकने के लिए कृपया इसके पूरा होने की प्रतीक्षा करें।`
            : `A generation request in ${modTitle} is already in progress. Please wait for it to finish.`,
        hint: preservedNote,
      };
    }

    return {
      title: lang === 'hi' ? `${modTitle} — अनुरोध सीमा पार (HTTP 429)` : `${modTitle} — Rate Limit Active (HTTP 429)`,
      message:
        lang === 'hi'
          ? `${scopeLabel} पर बहुत कम समय में कई अनुरोध भेजे गए। ${actionPhrase} के लिए कृपया ${sec} सेकंड इंतजार करें।`
          : `Too many requests were sent to ${scopeLabel} in a short window. Please wait ${sec} seconds before ${actionPhrase}.`,
      hint: [partialNote, preservedNote].filter(Boolean).join(' ') || undefined,
    };
  }

  // 3. Paid Image API blocked cleanly without permission
  if (code === 'PAID_API_NOT_ENABLED') {
    return {
      title: lang === 'hi' ? `${modTitle} — पेड API अनुमति आवश्यक` : `${modTitle} — Paid API Disabled`,
      message:
        lang === 'hi'
          ? 'इमेज जनरेशन मॉडल पेड टियर पर निर्भर हैं और आपकी अनुमति के बिना कोई पेड API या बिलिंग चालू नहीं की गई है। टेक्स्ट व प्रॉम्प्ट जनरेशन सामान्य रूप से सक्रिय हैं।'
          : 'Direct image rendering requires a paid model and is kept disabled because no billing or paid API was authorized. Text and prompt generation remain available.',
      hint: preservedNote,
    };
  }

  // 4. Incomplete / Invalid AI output
  if (code === 'INVALID_AI_OUTPUT') {
    return {
      title: lang === 'hi' ? `${modTitle} — अधूरा या अमान्य उत्तर` : `${modTitle} — Incomplete Output`,
      message:
        lang === 'hi'
          ? `${modTitle} को AI से पूरा डेटा प्राप्त नहीं हुआ, इसलिए इस विफल प्रयास को सेव नहीं किया गया। कृपया फिर से प्रयास करें।`
          : `${modTitle} received an incomplete response from the model and did not treat it as successful. Please retry.`,
      hint: preservedNote,
    };
  }

  // 5. API Key / Config errors
  if (code === 'API_KEY_INVALID' || code === 'MISSING_API_KEY') {
    return {
      title: lang === 'hi' ? `${modTitle} — सर्वर कुंजी त्रुटि` : `${modTitle} — Server Key Error`,
      message:
        lang === 'hi'
          ? `${modTitle} अभी उपलब्ध नहीं है क्योंकि सर्वर पर GEMINI_API_KEY मान्य नहीं है या सेट नहीं है।`
          : `${modTitle} cannot run right now because GEMINI_API_KEY on the server is missing or invalid.`,
      hint: preservedNote,
    };
  }

  // 6. Upstream 503
  if (code === 'UPSTREAM_UNAVAILABLE' || status === 503) {
    return {
      title: lang === 'hi' ? `${modTitle} — सेवा अस्थायी रूप से व्यस्त` : `${modTitle} — Service Temporarily Busy`,
      message:
        lang === 'hi'
          ? `अस्थायी नेटवर्क/सर्वर व्यस्तता के कारण ${actionPhrase} का प्रयास विफल रहा। कृपया कुछ सेकंड बाद फिर कोशिश करें।`
          : `Temporary service interruption while ${actionPhrase}. Please retry in a few moments.`,
      hint: [partialNote, preservedNote].filter(Boolean).join(' ') || undefined,
    };
  }

  const rawMsg = err instanceof Error ? err.message : String(err);
  return {
    title: `${modTitle}`,
    message: rawMsg,
    hint: [partialNote, preservedNote].filter(Boolean).join(' ') || undefined,
  };
}
