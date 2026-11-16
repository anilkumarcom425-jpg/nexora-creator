import React, { useState } from 'react';
import {
  BookOpen,
  Clapperboard,
  FileEdit,
  Film,
  FolderKanban,
  Home,
  Menu,
  PenTool,
  Settings,
  Share2,
  Wand2,
  X,
} from 'lucide-react';
import { Translations } from '../i18n/translations';
import { SectionId, UILanguage } from '../types/nexora';

interface LayoutProps {
  activeSection: SectionId;
  onSelectSection: (section: SectionId) => void;
  uiLanguage: UILanguage;
  onChangeLanguage: (lang: UILanguage) => void;
  t: Translations;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{ id: SectionId; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'home', icon: Home },
  { id: 'blog', icon: PenTool },
  { id: 'shorts', icon: Clapperboard },
  { id: 'long-video', icon: Film },
  { id: 'social', icon: Share2 },
  { id: 'story', icon: BookOpen },
  { id: 'prompts', icon: Wand2 },
  { id: 'editor', icon: FileEdit },
  { id: 'projects', icon: FolderKanban },
  { id: 'settings', icon: Settings },
];

export const Layout: React.FC<LayoutProps> = ({
  activeSection,
  onSelectSection,
  uiLanguage,
  onChangeLanguage,
  t,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (id: SectionId) => {
    onSelectSection(id);
    setMobileOpen(false);
  };

  const renderNavLinks = () => (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Main Navigation">
      {NAV_ITEMS.map(({ id, icon: Icon }) => {
        const isActive = activeSection === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => handleNav(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
            <span className="truncate">{t.nav[id]}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar (Dark Navy) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[260px] lg:shrink-0 bg-[#0B1221] text-white border-r border-slate-800/80 sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M5 19V5l14 14V5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold tracking-tight text-white leading-tight whitespace-nowrap">
              {t.brand.name}
            </div>
            <div className="text-xs text-slate-400 truncate">
              {t.brand.product}
            </div>
          </div>
        </div>

        {renderNavLinks()}

        <div className="px-5 py-4 border-t border-slate-800/80 text-xs text-slate-400">
          <div className="font-medium text-slate-300">{t.brand.name}</div>
          <div className="mt-0.5 text-slate-400 leading-snug">{t.brand.tagline}</div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[272px] max-w-[85vw] bg-[#0B1221] text-white flex flex-col h-full border-r border-slate-800">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M5 19V5l14 14V5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
                  {t.brand.product}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNavLinks()}
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
              {t.nav[activeSection]}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Language Selector: हिंदी | English */}
            <div
              className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200"
              role="group"
              aria-label={t.common.language}
            >
              <button
                type="button"
                onClick={() => onChangeLanguage('hi')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  uiLanguage === 'hi'
                    ? 'bg-[#0B1221] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                हिंदी
              </button>
              <button
                type="button"
                onClick={() => onChangeLanguage('en')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  uiLanguage === 'en'
                    ? 'bg-[#0B1221] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English
              </button>
            </div>

            {activeSection !== 'editor' && (
              <button
                type="button"
                onClick={() => onSelectSection('editor')}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0B1221] text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>{t.nav.editor}</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1320px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
