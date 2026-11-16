import React, { useMemo, useState } from 'react';
import {
  Check,
  Download,
  Edit3,
  FileEdit,
  FolderOpen,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Translations } from '../../i18n/translations';
import { countWords, downloadTextFile } from '../../services/storage';
import { ProjectCategory, SavedProject, SectionId } from '../../types/nexora';

interface MyProjectsProps {
  t: Translations;
  projects: SavedProject[];
  onOpenProject: (project: SavedProject) => void;
  onRenameProject: (id: string, newTitle: string) => void;
  onDeleteProject: (id: string) => void;
  onNavigate: (section: SectionId) => void;
}

const FILTER_CATEGORIES: Array<ProjectCategory | 'all'> = [
  'all',
  'blog',
  'shorts',
  'long-video',
  'social',
  'story',
  'prompts',
  'editor',
];

export const MyProjects: React.FC<MyProjectsProps> = ({
  t,
  projects,
  onOpenProject,
  onRenameProject,
  onDeleteProject,
  onNavigate,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProjectCategory | 'all'>('all');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      const catMatch = categoryFilter === 'all' || p.category === categoryFilter;
      if (!catMatch) return false;
      if (!q) return true;
      return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
    });
  }, [projects, search, categoryFilter]);

  const startRename = (project: SavedProject) => {
    setRenamingId(project.id);
    setRenameText(project.title);
  };

  const commitRename = (id: string) => {
    if (renameText.trim()) {
      onRenameProject(id, renameText.trim());
    }
    setRenamingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t.projects.title}</h2>
            <p className="mt-0.5 text-sm text-slate-600">{t.projects.subtitle}</p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {t.common.localStorageBadge}
          </span>
        </div>
        <p className="text-xs text-slate-500 pt-1">{t.projects.storageNotice}</p>
      </div>

      {/* Search & Category Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.common.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {FILTER_CATEGORIES.map((cat) => {
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#0B1221] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t.categories[cat]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Projects List or Empty States */}
      {projects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">{t.projects.emptyTitle}</h3>
          <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">{t.projects.emptyDesc}</p>
          <button
            type="button"
            onClick={() => onNavigate('blog')}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#0B1221] text-white hover:bg-slate-800"
          >
            <span>{t.projects.createNew}</span>
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Search className="w-9 h-9 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">{t.projects.noSearchTitle}</h3>
          <p className="mt-1 text-sm text-slate-500">{t.projects.noSearchDesc}</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
          {filtered.map((project) => (
            <div key={project.id} className="p-4 sm:p-5 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {renamingId === project.id ? (
                    <div className="flex items-center gap-2 max-w-md">
                      <input
                        type="text"
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename(project.id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        className="flex-1 px-3 py-1.5 text-sm font-semibold rounded-lg border border-blue-600 focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => commitRename(project.id)}
                        className="p-1.5 rounded-lg bg-[#0B1221] text-white"
                        aria-label="Confirm rename"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingId(null)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600"
                        aria-label="Cancel rename"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-base font-bold text-slate-900 truncate">
                      {project.title}
                    </h3>
                  )}

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 tabular-nums">
                    <span>{t.categories[project.category]}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {countWords(project.content)} {t.common.words}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {t.projects.updatedLabel} {new Date(project.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenProject(project)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0B1221] text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    <span>{t.common.edit}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => startRename(project)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{t.common.rename}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadTextFile(project.title, project.content)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.common.downloadTxt}</span>
                  </button>

                  {confirmDeleteId === project.id ? (
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteProject(project.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 whitespace-nowrap shrink-0"
                      >
                        {t.common.confirmDelete}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 whitespace-nowrap shrink-0"
                      >
                        {t.common.cancel}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(project.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-red-600 hover:bg-red-50 whitespace-nowrap shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.common.delete}</span>
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                {project.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
