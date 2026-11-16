import { AppSettings, CharacterProfile, ProjectCategory, SavedProject } from '../types/nexora';

const PROJECTS_KEY = 'nexora_projects_v1';
const CHARACTERS_KEY = 'nexora_characters_v1';
const SETTINGS_KEY = 'nexora_settings_v1';

export function loadProjects(): SavedProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedProject[]) : [];
  } catch {
    return [];
  }
}

export function persistProjects(projects: SavedProject[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function upsertProject(input: {
  id?: string;
  title: string;
  category: ProjectCategory;
  content: string;
}): SavedProject[] {
  const projects = loadProjects();
  const now = new Date().toISOString();
  if (input.id) {
    const idx = projects.findIndex((p) => p.id === input.id);
    if (idx !== -1) {
      const updated = [...projects];
      updated[idx] = {
        ...updated[idx],
        title: input.title.trim() || updated[idx].title,
        category: input.category,
        content: input.content,
        updatedAt: now,
      };
      persistProjects(updated);
      return updated;
    }
  }
  const created: SavedProject = {
    id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: input.title.trim() || 'Untitled Project',
    category: input.category,
    content: input.content,
    createdAt: now,
    updatedAt: now,
  };
  const next = [created, ...projects];
  persistProjects(next);
  return next;
}

export function loadCharacters(): CharacterProfile[] {
  try {
    const raw = localStorage.getItem(CHARACTERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CharacterProfile[]) : [];
  } catch {
    return [];
  }
}

export function persistCharacters(chars: CharacterProfile[]): void {
  localStorage.setItem(CHARACTERS_KEY, JSON.stringify(chars));
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return { uiLanguage: 'hi', defaultContentLanguage: 'Hindi' };
    }
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      uiLanguage: parsed.uiLanguage === 'en' ? 'en' : 'hi',
      defaultContentLanguage:
        parsed.defaultContentLanguage === 'English' || parsed.defaultContentLanguage === 'Hinglish'
          ? parsed.defaultContentLanguage
          : 'Hindi',
    };
  } catch {
    return { uiLanguage: 'hi', defaultContentLanguage: 'Hindi' };
  }
}

export function persistSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function clearAllLocalData(): void {
  localStorage.removeItem(PROJECTS_KEY);
  localStorage.removeItem(CHARACTERS_KEY);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadTextFile(filename: string, content: string): void {
  const safeName = filename
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f_-]+/gi, '_')
    .replace(/^_+|_+$/g, '') || 'nexora_content';
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadJsonBackup(projects: SavedProject[], characters: CharacterProfile[]): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    source: 'NEXORA Creator (Local Browser Storage)',
    projects,
    characters,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nexora_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
