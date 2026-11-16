/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { BlogWriter } from './components/pages/BlogWriter';
import { ContentEditor } from './components/pages/ContentEditor';
import { HomeDashboard } from './components/pages/HomeDashboard';
import { LongVideoWriter } from './components/pages/LongVideoWriter';
import { MyProjects } from './components/pages/MyProjects';
import { PromptGenerator } from './components/pages/PromptGenerator';
import { SettingsPage } from './components/pages/SettingsPage';
import { ShortsWriter } from './components/pages/ShortsWriter';
import { SocialMediaCreator } from './components/pages/SocialMediaCreator';
import { StoryCharacterStudio } from './components/pages/StoryCharacterStudio';
import { TRANSLATIONS } from './i18n/translations';
import {
  clearAllLocalData,
  loadCharacters,
  loadProjects,
  loadSettings,
  persistCharacters,
  persistProjects,
  persistSettings,
  upsertProject,
} from './services/storage';
import {
  AppSettings,
  CharacterProfile,
  EditorDraft,
  ProjectCategory,
  SavedProject,
  SectionId,
  UILanguage,
} from './types/nexora';

export default function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('home');
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [projects, setProjects] = useState<SavedProject[]>(() => loadProjects());
  const [characters, setCharacters] = useState<CharacterProfile[]>(() => loadCharacters());
  const [editorDraft, setEditorDraft] = useState<EditorDraft>({
    title: '',
    category: 'editor',
    content: '',
  });
  const [toast, setToast] = useState<string | null>(null);

  const t = TRANSLATIONS[settings.uiLanguage];

  useEffect(() => {
    document.documentElement.lang = settings.uiLanguage;
  }, [settings.uiLanguage]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const handleUpdateSettings = (next: AppSettings) => {
    setSettings(next);
    persistSettings(next);
  };

  const handleChangeUiLanguage = (lang: UILanguage) => {
    handleUpdateSettings({ ...settings, uiLanguage: lang });
  };

  const handleSaveProject = (
    title: string,
    category: ProjectCategory,
    content: string,
    projectId?: string
  ): string => {
    const next = upsertProject({ id: projectId, title, category, content });
    setProjects(next);
    showToast(t.common.saved);
    const saved = projectId ? next.find((p) => p.id === projectId) : next[0];
    return saved?.id || next[0]?.id || '';
  };

  const handleOpenInEditor = (draft: EditorDraft) => {
    setEditorDraft(draft);
    setActiveSection('editor');
  };

  const handleOpenProjectInEditor = (project: SavedProject) => {
    setEditorDraft({
      projectId: project.id,
      title: project.title,
      category: project.category,
      content: project.content,
    });
    setActiveSection('editor');
  };

  const handleRenameProject = (id: string, newTitle: string) => {
    const next = projects.map((p) =>
      p.id === id ? { ...p, title: newTitle, updatedAt: new Date().toISOString() } : p
    );
    setProjects(next);
    persistProjects(next);
  };

  const handleDeleteProject = (id: string) => {
    const next = projects.filter((p) => p.id !== id);
    setProjects(next);
    persistProjects(next);
  };

  const handleSaveCharacters = (next: CharacterProfile[]) => {
    setCharacters(next);
    persistCharacters(next);
  };

  const handleClearAllData = () => {
    clearAllLocalData();
    setProjects([]);
    setCharacters([]);
  };

  return (
    <Layout
      activeSection={activeSection}
      onSelectSection={setActiveSection}
      uiLanguage={settings.uiLanguage}
      onChangeLanguage={handleChangeUiLanguage}
      t={t}
    >
      {activeSection === 'home' && (
        <HomeDashboard
          t={t}
          projects={projects}
          characters={characters}
          onNavigate={setActiveSection}
          onOpenProject={handleOpenProjectInEditor}
        />
      )}

      {activeSection === 'blog' && (
        <BlogWriter
          t={t}
          defaultLanguage={settings.defaultContentLanguage}
          onSaveProject={(title, cat, content) => {
            handleSaveProject(title, cat, content);
          }}
          onOpenInEditor={handleOpenInEditor}
        />
      )}

      {activeSection === 'shorts' && (
        <ShortsWriter
          t={t}
          defaultLanguage={settings.defaultContentLanguage}
          onSaveProject={(title, cat, content) => {
            handleSaveProject(title, cat, content);
          }}
          onOpenInEditor={handleOpenInEditor}
        />
      )}

      {activeSection === 'long-video' && (
        <LongVideoWriter
          t={t}
          defaultLanguage={settings.defaultContentLanguage}
          onSaveProject={(title, cat, content) => {
            handleSaveProject(title, cat, content);
          }}
          onOpenInEditor={handleOpenInEditor}
        />
      )}

      {activeSection === 'social' && (
        <SocialMediaCreator
          t={t}
          defaultLanguage={settings.defaultContentLanguage}
          onSaveProject={(title, cat, content) => {
            handleSaveProject(title, cat, content);
          }}
          onOpenInEditor={handleOpenInEditor}
        />
      )}

      {activeSection === 'story' && (
        <StoryCharacterStudio
          t={t}
          defaultLanguage={settings.defaultContentLanguage}
          characters={characters}
          onSaveCharacters={handleSaveCharacters}
          onSaveProject={(title, cat, content) => {
            handleSaveProject(title, cat, content);
          }}
          onOpenInEditor={handleOpenInEditor}
        />
      )}

      {activeSection === 'prompts' && (
        <PromptGenerator
          t={t}
          onSaveProject={(title, cat, content) => {
            handleSaveProject(title, cat, content);
          }}
          onOpenInEditor={handleOpenInEditor}
        />
      )}

      {activeSection === 'editor' && (
        <ContentEditor
          t={t}
          draft={editorDraft}
          defaultLanguage={settings.defaultContentLanguage}
          onChangeDraft={setEditorDraft}
          onSaveProject={handleSaveProject}
        />
      )}

      {activeSection === 'projects' && (
        <MyProjects
          t={t}
          projects={projects}
          onOpenProject={handleOpenProjectInEditor}
          onRenameProject={handleRenameProject}
          onDeleteProject={handleDeleteProject}
          onNavigate={setActiveSection}
        />
      )}

      {activeSection === 'settings' && (
        <SettingsPage
          t={t}
          settings={settings}
          projects={projects}
          characters={characters}
          onUpdateSettings={handleUpdateSettings}
          onClearAllData={handleClearAllData}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg bg-[#0B1221] text-white text-xs font-semibold shadow-lg border border-slate-700"
        >
          {toast}
        </div>
      )}
    </Layout>
  );
}
