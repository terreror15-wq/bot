import React, { useState } from 'react';
import {
  Check,
  FolderOpen,
  KeyRound,
  Save,
  Send,
  ShieldCheck,
} from 'lucide-react';
import type { CredentialsStatus, SystemSettings } from '../types/botchase';

interface SettingsViewProps {
  settings: SystemSettings;
  credentials: CredentialsStatus;
  onSaveSettings: (next: SystemSettings) => Promise<void>;
  onSaveCredentials: (payload: {
    telegramBotToken?: string;
    telegramChatId?: string;
    moodleUser?: string;
    moodlePass?: string;
  }) => Promise<void>;
  onOpenFolderPicker: () => void;
  onTestTelegram: () => Promise<{ ok: boolean; detail: string }>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  credentials,
  onSaveSettings,
  onSaveCredentials,
  onOpenFolderPicker,
  onTestTelegram,
}) => {
  const [draftSettings, setDraftSettings] = useState<SystemSettings>(settings);
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [moodleUser, setMoodleUser] = useState('');
  const [moodlePass, setMoodlePass] = useState('');

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);
  const [credsSaved, setCredsSaved] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);

  // Sync outputDir when chosen from FolderPickerModal
  React.useEffect(() => {
    setDraftSettings((prev) => ({ ...prev, outputDir: settings.outputDir }));
  }, [settings.outputDir]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await onSaveSettings(draftSettings);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2800);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCreds(true);
    try {
      await onSaveCredentials({
        telegramBotToken,
        telegramChatId,
        moodleUser,
        moodlePass,
      });
      setTelegramBotToken('');
      setTelegramChatId('');
      setMoodleUser('');
      setMoodlePass('');
      setCredsSaved(true);
      setTimeout(() => setCredsSaved(false), 2800);
    } finally {
      setSavingCreds(false);
    }
  };

  const handleTelegramTest = async () => {
    setTelegramStatus('Enviando prueba...');
    const res = await onTestTelegram();
    setTelegramStatus(res.detail);
  };

  const toggleSetting = (
    key: 'useSystemEdge' | 'minimizeToTray' | 'watchOnLaunch' | 'headlessBrowser'
  ) => {
    setDraftSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-[#F4F6FB]">Ajustes privados, rutas y sistema</h1>
        <p className="text-[13.5px] text-[#8E98B0]">
          Credenciales locales cifradas en servidor, carpeta de salida real y comportamiento del navegador.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Local Credentials */}
        <form
          onSubmit={handleSaveCredentials}
          className="xl:col-span-6 bg-[#171B26] border border-[#252B3B] rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#6B93F5]" />
              <h2 className="text-[15px] font-semibold text-[#F3F5FA]">Credenciales locales</h2>
            </div>
            <button
              type="button"
              onClick={handleTelegramTest}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#12151E] hover:bg-[#1D2230] border border-[#252B3B] text-[#C8D4F0] cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-[#6B93F5]" />
              <span>Probar Telegram</span>
            </button>
          </div>

          {telegramStatus && (
            <div className="text-[12.5px] text-[#9DB8FA] bg-[#12151E] border border-[#252B3B] rounded-lg px-3 py-2">
              {telegramStatus}
            </div>
          )}

          {/* GEMINI_API_KEY read-only environment status (no input field per platform security contract) */}
          <div className="p-3.5 rounded-lg bg-[#12151E] border border-[#252B3B] flex items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-medium text-[#E6EAF2]">GEMINI_API_KEY (Entorno servidor)</div>
              <div className="text-[12px] text-[#7D879E]">
                Gestionada de forma segura por el entorno del servidor.
              </div>
            </div>
            <span
              className={`text-[12px] font-mono tabular-nums shrink-0 ${
                credentials.geminiConfigured ? 'text-[#34D399]' : 'text-[#FBBF24]'
              }`}
            >
              {credentials.geminiHint}
            </span>
          </div>

          <div className="space-y-3">
            <label className="block space-y-1">
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-[#9BA5BC]">TELEGRAM_BOT_TOKEN</span>
                <span
                  className={`font-mono text-[11.5px] ${
                    credentials.telegramTokenConfigured ? 'text-[#34D399]' : 'text-[#7D879E]'
                  }`}
                >
                  {credentials.telegramTokenHint}
                </span>
              </div>
              <input
                type="password"
                value={telegramBotToken}
                onChange={(e) => setTelegramBotToken(e.target.value)}
                placeholder="Dejar en blanco para conservar el token actual"
                className="w-full rounded-lg bg-[#12151E] border border-[#252B3B] px-3.5 py-2 text-[13px] font-mono text-[#E6EAF2] placeholder:text-[#5B647A] focus:outline-none focus:border-[#6B93F5]"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-[#9BA5BC]">TELEGRAM_CHAT_ID</span>
                <span
                  className={`font-mono text-[11.5px] ${
                    credentials.telegramChatConfigured ? 'text-[#34D399]' : 'text-[#7D879E]'
                  }`}
                >
                  {credentials.telegramChatHint}
                </span>
              </div>
              <input
                type="password"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="ID de chat de Telegram"
                className="w-full rounded-lg bg-[#12151E] border border-[#252B3B] px-3.5 py-2 text-[13px] font-mono text-[#E6EAF2] placeholder:text-[#5B647A] focus:outline-none focus:border-[#6B93F5]"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-[#9BA5BC]">Usuario ITLA (MOODLE_USER)</span>
                <span
                  className={`font-mono text-[11.5px] ${
                    credentials.moodleUserConfigured ? 'text-[#34D399]' : 'text-[#7D879E]'
                  }`}
                >
                  {credentials.moodleUserHint}
                </span>
              </div>
              <input
                type="text"
                value={moodleUser}
                onChange={(e) => setMoodleUser(e.target.value)}
                placeholder="ej. 20241842@itla.edu.do"
                className="w-full rounded-lg bg-[#12151E] border border-[#252B3B] px-3.5 py-2 text-[13px] text-[#E6EAF2] placeholder:text-[#5B647A] focus:outline-none focus:border-[#6B93F5]"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-[#9BA5BC]">Contraseña SSO (opcional)</span>
                <span
                  className={`font-mono text-[11.5px] ${
                    credentials.moodlePassConfigured ? 'text-[#34D399]' : 'text-[#7D879E]'
                  }`}
                >
                  {credentials.moodlePassHint}
                </span>
              </div>
              <input
                type="password"
                value={moodlePass}
                onChange={(e) => setMoodlePass(e.target.value)}
                placeholder="Opcional si prefieres login SSO manual"
                className="w-full rounded-lg bg-[#12151E] border border-[#252B3B] px-3.5 py-2 text-[13px] font-mono text-[#E6EAF2] placeholder:text-[#5B647A] focus:outline-none focus:border-[#6B93F5]"
              />
            </label>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[12px] text-[#7D879E]">
              <ShieldCheck className="w-4 h-4 text-[#34D399]" />
              <span>Guardado local exclusivo en servidor</span>
            </span>
            <button
              type="submit"
              disabled={savingCreds}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium bg-[#1D2230] hover:bg-[#252C3D] text-[#E6EAF2] border border-[#2D3548] cursor-pointer whitespace-nowrap"
            >
              {credsSaved ? <Check className="w-4 h-4 text-[#34D399]" /> : <Save className="w-4 h-4" />}
              <span>{credsSaved ? 'Actualizadas' : 'Guardar credenciales'}</span>
            </button>
          </div>
        </form>

        {/* Paths, Performance & System Toggles */}
        <form
          onSubmit={handleSaveSettings}
          className="xl:col-span-6 bg-[#171B26] border border-[#252B3B] rounded-xl p-6 space-y-5"
        >
          <h2 className="text-[15px] font-semibold text-[#F3F5FA]">Rutas, rendimiento y sistema</h2>

          {/* Output Dir Picker */}
          <div className="space-y-1.5">
            <span className="text-[12.5px] text-[#8E98B0] block">
              Carpeta de salida para PDFs y DOCX (`output_dir`)
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={draftSettings.outputDir}
                onChange={(e) =>
                  setDraftSettings((p) => ({ ...p, outputDir: e.target.value }))
                }
                className="flex-1 rounded-lg bg-[#12151E] border border-[#252B3B] px-3.5 py-2 text-[12.5px] font-mono text-[#E6EAF2] focus:outline-none focus:border-[#6B93F5]"
              />
              <button
                type="button"
                onClick={onOpenFolderPicker}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1D2230] hover:bg-[#252C3D] border border-[#2D3548] text-[13px] font-medium text-[#E6EAF2] cursor-pointer whitespace-nowrap shrink-0"
              >
                <FolderOpen className="w-4 h-4 text-[#6B93F5]" />
                <span>Elegir carpeta...</span>
              </button>
            </div>
          </div>

          {/* Interval & Threads */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-[12.5px] text-[#8E98B0] block">Intervalo por defecto (min)</span>
              <input
                type="number"
                min={1}
                max={720}
                value={draftSettings.defaultIntervalMinutes}
                onChange={(e) =>
                  setDraftSettings((p) => ({
                    ...p,
                    defaultIntervalMinutes: Number(e.target.value) || 30,
                  }))
                }
                className="w-full rounded-lg bg-[#12151E] border border-[#252B3B] px-3.5 py-2 text-[13.5px] font-mono tabular-nums text-[#E6EAF2] focus:outline-none focus:border-[#6B93F5]"
              />
            </label>

            <div className="space-y-1.5">
              <span className="text-[12.5px] text-[#8E98B0] block">Hilos paralelos de Gemini (1–4)</span>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#12151E] border border-[#252B3B] rounded-lg">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDraftSettings((p) => ({ ...p, geminiThreads: n }))}
                    className={`py-1.5 rounded-md font-mono text-[13px] font-semibold cursor-pointer ${
                      draftSettings.geminiThreads === n
                        ? 'bg-[#6B93F5]/20 text-[#EBF0FF]'
                        : 'text-[#8E98B0] hover:text-[#E6EAF2]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* System Toggles */}
          <div className="space-y-2.5 pt-2 border-t border-[#252B3B]">
            <div className="text-[13px] font-medium text-[#D8E0F2]">Comportamiento del sistema</div>

            {(
              [
                {
                  key: 'useSystemEdge',
                  label: 'Usar Microsoft Edge del sistema',
                  desc: 'Reutiliza la instalación local de Edge para Playwright.',
                },
                {
                  key: 'minimizeToTray',
                  label: 'Minimizar a bandeja del sistema',
                  desc: 'Mantiene el bot en segundo plano al minimizar la ventana.',
                },
                {
                  key: 'watchOnLaunch',
                  label: 'Activar vigilancia al abrir',
                  desc: 'Inicia el temporizador automático al arrancar BotChase.',
                },
                {
                  key: 'headlessBrowser',
                  label: 'Navegador oculto (headless)',
                  desc: 'Desactivado por defecto para permitir verificación SSO visual.',
                },
              ] as const
            ).map((item) => {
              const active = draftSettings[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleSetting(item.key)}
                  className="w-full flex items-center justify-between gap-4 px-3.5 py-2.5 rounded-lg bg-[#12151E] border border-[#252B3B] text-left cursor-pointer hover:border-[#343D54]"
                >
                  <div>
                    <div className="text-[13px] font-medium text-[#E6EAF2]">{item.label}</div>
                    <div className="text-[11.5px] text-[#7D879E]">{item.desc}</div>
                  </div>
                  <span
                    className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${
                      active ? 'bg-[#6B93F5]' : 'bg-[#2A3142]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        active ? 'left-[18px]' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13.5px] font-medium bg-[#6B93F5] hover:bg-[#5A82E6] text-[#0B101B] disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              {settingsSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{settingsSaved ? 'Ajustes guardados' : 'Guardar ajustes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
