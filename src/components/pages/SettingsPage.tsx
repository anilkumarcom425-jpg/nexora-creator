import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Trash2 } from 'lucide-react';
import { Translations } from '../../i18n/translations';
import { checkApiHealth } from '../../services/aiClient';
import { downloadJsonBackup } from '../../services/storage';
import {
  AppSettings,
  CharacterProfile,
  ContentLanguage,
  HealthStatus,
  SavedProject,
  UILanguage,
} from '../../types/nexora';

interface SettingsPageProps {
  t: Translations;
  settings: AppSettings;
  projects: SavedProject[];
  characters: CharacterProfile[];
  onUpdateSettings: (next: AppSettings) => void;
  onClearAllData: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  t,
  settings,
  projects,
  characters,
  onUpdateSettings,
  onClearAllData,
}) => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearedNotice, setClearedNotice] = useState(false);

  useEffect(() => {
    checkApiHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const handleClear = () => {
    onClearAllData();
    setConfirmClear(false);
    setClearedNotice(true);
    setTimeout(() => setClearedNotice(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">{t.settings.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.settings.subtitle}</p>
      </div>

      {/* Interface Language */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{t.settings.interfaceLangTitle}</h3>
          <p className="mt-1 text-xs text-slate-600">{t.settings.interfaceLangDesc}</p>
        </div>
        <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 shrink-0 self-start sm:self-auto">
          {(['hi', 'en'] as UILanguage[]).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => onUpdateSettings({ ...settings, uiLanguage: lang })}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                settings.uiLanguage === lang
                  ? 'bg-[#0B1221] text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'hi' ? 'हिंदी' : 'English'}
            </button>
          ))}
        </div>
      </div>

      {/* Default Generation Language */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{t.settings.defaultGenLangTitle}</h3>
          <p className="mt-1 text-xs text-slate-600">{t.settings.defaultGenLangDesc}</p>
        </div>
        <select
          value={settings.defaultContentLanguage}
          onChange={(e) =>
            onUpdateSettings({
              ...settings,
              defaultContentLanguage: e.target.value as ContentLanguage,
            })
          }
          className="px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-blue-600 shrink-0"
        >
          <option value="Hindi">हिंदी (Hindi)</option>
          <option value="English">English</option>
          <option value="Hinglish">Hinglish</option>
        </select>
      </div>

      {/* Server AI Engine Status (never asks for API key in UI) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{t.settings.aiEngineTitle}</h3>
          <p className="mt-1 text-xs text-slate-600">{t.settings.aiEngineDesc}</p>
        </div>
        {health && (
          <div
            className={`flex items-center gap-2.5 p-3.5 rounded-lg border text-xs font-medium ${
              health.configured
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {health.configured ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>
              {health.configured ? t.settings.aiReady : t.settings.aiMissingKey} ({health.model})
            </span>
          </div>
        )}
      </div>

      {/* Local Storage & Backup */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{t.settings.storageTitle}</h3>
          <p className="mt-1 text-xs text-slate-600">{t.settings.storageDesc}</p>
        </div>

        <div className="text-xs text-slate-600 tabular-nums">
          {t.home.statProjects}: <strong className="text-slate-900">{projects.length}</strong> ·{' '}
          {t.home.statCharacters}: <strong className="text-slate-900">{characters.length}</strong>
        </div>

        {clearedNotice && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900">
            {t.settings.dataCleared}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => downloadJsonBackup(projects, characters)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.settings.exportBackup}</span>
          </button>

          {confirmClear ? (
            <div className="inline-flex items-center gap-2">
              <span className="text-xs text-red-700 font-medium">{t.settings.clearConfirm}</span>
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                {t.common.confirmDelete}
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                {t.common.cancel}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.settings.clearData}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
