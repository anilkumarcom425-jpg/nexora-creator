import { UILanguage } from '../types/nexora';

export type DurationUnit = 'seconds' | 'minutes';
export type SocialLengthUnit = 'words' | 'characters';

export interface LengthValidationResult {
  valid: boolean;
  error?: string;
  normalizedValue: string;
  numericAmount?: number;
}

export function validateShortsCustomDuration(
  amountStr: string,
  unit: DurationUnit,
  lang: UILanguage
): LengthValidationResult {
  const num = Number(amountStr);
  if (!amountStr.trim() || !Number.isFinite(num) || !Number.isInteger(num)) {
    return {
      valid: false,
      normalizedValue: '',
      error:
        lang === 'hi'
          ? 'कृपया कस्टम अवधि के लिए एक वैध पूर्ण संख्या दर्ज करें।'
          : 'Please enter a valid whole number for custom duration.',
    };
  }
  const totalSeconds = unit === 'minutes' ? num * 60 : num;
  if (totalSeconds < 5 || totalSeconds > 1800) {
    return {
      valid: false,
      normalizedValue: '',
      error:
        lang === 'hi'
          ? 'शॉर्ट्स/रील की कस्टम अवधि 5 सेकंड से 30 मिनट (1800 सेकंड) के बीच होनी चाहिए।'
          : 'Custom Shorts duration must be between 5 seconds and 30 minutes (1800 seconds).',
    };
  }
  return {
    valid: true,
    numericAmount: totalSeconds,
    normalizedValue: `${num} ${unit === 'minutes' ? (num === 1 ? 'minute' : 'minutes') : num === 1 ? 'second' : 'seconds'}`,
  };
}

export function validateLongVideoCustomDuration(
  minutesStr: string,
  lang: UILanguage
): LengthValidationResult {
  const num = Number(minutesStr);
  if (!minutesStr.trim() || !Number.isFinite(num) || !Number.isInteger(num)) {
    return {
      valid: false,
      normalizedValue: '',
      error:
        lang === 'hi'
          ? 'कृपया मिनट में एक वैध पूर्ण संख्या दर्ज करें (जैसे 5, 20, 60 या 120)।'
          : 'Please enter a valid whole number of minutes (e.g. 5, 20, 60, or 120).',
    };
  }
  if (num < 1 || num > 240) {
    return {
      valid: false,
      normalizedValue: '',
      error:
        lang === 'hi'
          ? 'लॉन्ग वीडियो की कस्टम अवधि 1 से 240 मिनट के बीच होनी चाहिए।'
          : 'Custom long video duration must be between 1 and 240 minutes.',
    };
  }
  return {
    valid: true,
    numericAmount: num,
    normalizedValue: `${num} ${num === 1 ? 'minute' : 'minutes'}`,
  };
}

export function validateCustomWordCount(
  wordsStr: string,
  min: number,
  max: number,
  lang: UILanguage
): LengthValidationResult {
  const num = Number(wordsStr);
  if (!wordsStr.trim() || !Number.isFinite(num) || !Number.isInteger(num)) {
    return {
      valid: false,
      normalizedValue: '',
      error:
        lang === 'hi'
          ? 'कृपया शब्दों की संख्या के लिए एक वैध पूर्ण संख्या दर्ज करें।'
          : 'Please enter a valid whole number for word count.',
    };
  }
  if (num < min || num > max) {
    return {
      valid: false,
      normalizedValue: '',
      error:
        lang === 'hi'
          ? `कस्टम शब्द संख्या ${min} से ${max} शब्दों के बीच होनी चाहिए।`
          : `Custom word count must be between ${min} and ${max} words.`,
    };
  }
  return {
    valid: true,
    numericAmount: num,
    normalizedValue: String(num),
  };
}

export function validateSocialCustomLength(
  amountStr: string,
  unit: SocialLengthUnit,
  lang: UILanguage
): LengthValidationResult {
  const num = Number(amountStr);
  if (!amountStr.trim() || !Number.isFinite(num) || !Number.isInteger(num)) {
    return {
      valid: false,
      normalizedValue: '',
      error:
        lang === 'hi'
          ? 'कृपया कस्टम लंबाई के लिए एक वैध पूर्ण संख्या दर्ज करें।'
          : 'Please enter a valid whole number for custom length.',
    };
  }
  if (unit === 'words' && (num < 10 || num > 1500)) {
    return {
      valid: false,
      normalizedValue: '',
      error:
        lang === 'hi'
          ? 'सोशल मीडिया कस्टम शब्द संख्या 10 से 1500 शब्दों के बीच होनी चाहिए।'
          : 'Social media custom word count must be between 10 and 1500 words.',
    };
  }
  if (unit === 'characters' && (num < 30 || num > 5000)) {
    return {
      valid: false,
      normalizedValue: '',
      error:
        lang === 'hi'
          ? 'सोशल मीडिया कस्टम अक्षर संख्या 30 से 5000 अक्षरों के बीच होनी चाहिए।'
          : 'Social media custom character count must be between 30 and 5000 characters.',
    };
  }
  return {
    valid: true,
    numericAmount: num,
    normalizedValue: `${num} ${unit}`,
  };
}
