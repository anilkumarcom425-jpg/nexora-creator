import React from 'react';
import {
  ArrowRight,
  BookOpen,
  Clapperboard,
  Film,
  FolderOpen,
  PenTool,
  Share2,
  Wand2,
} from 'lucide-react';
import { Translations } from '../../i18n/translations';
import { countWords } from '../../services/storage';
import { CharacterProfile, SavedProject, SectionId } from '../../types/nexora';

interface HomeDashboardProps {
  t: Translations;
  projects: SavedProject[];
  characters: CharacterProfile[];
  onNavigate: (section: SectionId) => void;
  onOpenProject: (project: SavedProject) => void;
}

const SHORTCUT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  blog: PenTool,
  shorts: Clapperboard,
  'long-video': Film,
  social: Share2,
  story: BookOpen,
  prompts: Wand2,
};

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  t,
  projects,
  characters,
  onNavigate,
  onOpenProject,
}) => {
  const totalWords = projects.reduce((sum, p) => sum + countWords(p.content), 0);
  const recentProjects = projects.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="rounded-2xl bg-[#0B1221] text-white p-6 sm:p-8 border border-slate-800">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold tracking-wide text-blue-400 mb-2">
            {t.brand.product} · {t.brand.tagline}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white [text-wrap:balance]">
            {t.home.welcomeTitle}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            {t.home.welcomeSubtitle}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('blog')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
            >
              <span>{t.home.startCreating}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 text-slate-100 text-sm font-semibold hover:bg-slate-700 border border-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              <span>{t.home.openProjects}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Real Workspace Metrics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500">{t.home.statProjects}</div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
            {projects.length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500">{t.home.statCharacters}</div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
            {characters.length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500">{t.home.statWords}</div>
          <div className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
            {totalWords.toLocaleString()}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
          <div className="text-xs font-medium text-slate-500">{t.home.statStorage}</div>
          <div className="mt-1.5 text-lg font-semibold text-slate-900 truncate">
            {t.home.localModeValue}
          </div>
        </div>
      </section>

      {/* Creation Shortcuts */}
      <section>
        <h3 className="text-base font-semibold text-slate-900 mb-4">
          {t.home.shortcutsHeading}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {t.home.shortcuts.map((item) => {
            const Icon = SHORTCUT_ICONS[item.id] || PenTool;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className="group text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-600 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-slate-100 text-[#0B1221] group-hover:bg-[#0B1221] group-hover:text-white transition-colors flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-base font-semibold text-slate-900">{item.title}</div>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
                <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                  <span>{t.nav[item.id]}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent Projects */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="text-base font-semibold text-slate-900">{t.home.recentHeading}</h3>
          {projects.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap shrink-0"
            >
              {t.home.openProjects}
            </button>
          )}
        </div>

        {recentProjects.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-slate-200 rounded-lg">
            <FolderOpen className="w-8 h-8 text-slate-400 mx-auto mb-2.5" />
            <div className="text-sm font-semibold text-slate-900">{t.home.noRecentProjects}</div>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">{t.home.noRecentHint}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {project.title}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 tabular-nums">
                    <span>{t.categories[project.category]}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {countWords(project.content)} {t.common.words}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenProject(project)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 self-start sm:self-auto"
                >
                  {t.common.openInEditor}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
