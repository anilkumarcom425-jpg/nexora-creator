export type UILanguage = 'hi' | 'en';
export type ContentLanguage = 'Hindi' | 'English' | 'Hinglish';

export type SectionId =
  | 'home'
  | 'blog'
  | 'shorts'
  | 'long-video'
  | 'social'
  | 'story'
  | 'prompts'
  | 'editor'
  | 'projects'
  | 'settings';

export type ProjectCategory =
  | 'blog'
  | 'shorts'
  | 'long-video'
  | 'social'
  | 'story'
  | 'prompts'
  | 'editor';

export interface BlogSection {
  h2: string;
  content: string;
  partNumber?: number;
  subsections: Array<{
    h3: string;
    content: string;
  }>;
}

export interface BlogResult {
  seoTitle: string;
  metaDescription: string;
  introduction: string;
  sections: BlogSection[];
  examples: string[];
  conclusion: string;
  faqs: Array<{ question: string; answer: string }>;
  seoKeywordSuggestions: string[];
  targetLengthLabel?: string;
  totalParts?: number;
}

export interface ShortsScene {
  sceneNumber: number;
  partNumber?: number;
  durationEstimate: string;
  speakingCharacter: string;
  dialogue: string;
  visualDescription: string;
  aiImagePrompt: string;
  aiVideoPrompt: string;
}

export interface ShortsResult {
  title: string;
  hook: string;
  characterAppearanceGuide: string;
  scenes: ShortsScene[];
  ending: string;
  likeSubscribeLine: string;
  targetLengthLabel?: string;
  totalParts?: number;
}

export interface LongVideoSection {
  timestamp: string;
  partNumber?: number;
  sectionTitle: string;
  scriptContent: string;
  sceneSuggestion: string;
  transition: string;
}

export interface LongVideoResult {
  videoTitle: string;
  openingHook: string;
  introduction: string;
  sections: LongVideoSection[];
  conclusion: string;
  viewerCta: string;
  targetLengthLabel?: string;
  totalParts?: number;
}

export interface SocialResult {
  headlineOrHook: string;
  primaryContent: string;
  alternativeVersions: string[];
  hashtags: string[];
  ctaLine: string;
  targetLengthLabel?: string;
}

export interface CharacterProfile {
  id: string;
  name: string;
  role: string;
  personality: string;
  appearance: string;
  voiceStyle: string;
  createdAt: string;
}

export interface StoryScene {
  sceneNumber: number;
  partNumber?: number;
  locationAndMood: string;
  narrative: string;
  dialogues: Array<{ characterName: string; line: string }>;
  aiImagePrompt: string;
  aiVideoPrompt: string;
}

export interface StoryResult {
  storyTitle: string;
  characterReferenceSummary: string;
  scenes: StoryScene[];
  ending: string;
  targetLengthLabel?: string;
  totalParts?: number;
}

export interface PromptResult {
  title: string;
  mainPrompt: string;
  technicalAndLightingNotes: string;
  negativeOrAvoid: string;
  variations: string[];
}

export interface SavedProject {
  id: string;
  title: string;
  category: ProjectCategory;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface EditorDraft {
  projectId?: string;
  title: string;
  category: ProjectCategory;
  content: string;
  regenerateContext?: {
    mode: string;
    payload: Record<string, unknown>;
  };
}

export interface AppSettings {
  uiLanguage: UILanguage;
  defaultContentLanguage: ContentLanguage;
}

export interface HealthStatus {
  ok: boolean;
  configured: boolean;
  model: string;
  storageMode: string;
}
