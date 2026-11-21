import { useCallback, useEffect, useState } from 'react';
import { CalendarWatchView } from './components/CalendarWatchView';
import { CoverStudioView } from './components/CoverStudioView';
import { DashboardView } from './components/DashboardView';
import {
  ConnectItlaModal,
  FolderPickerModal,
  OutputExplorerModal,
  PdfPreviewModal,
  SystemTrayDock,
} from './components/Modals';
import { ProfileView } from './components/ProfileView';
import { SettingsView } from './components/SettingsView';
import { Sidebar } from './components/Sidebar';
import { TasksView } from './components/TasksView';
import type {
  ActivityEvent,
  BootstrapPayload,
  BotState,
  CoverConfig,
  CredentialsStatus,
  LogEntry,
  NavSection,
  StudentProfile,
  SystemSettings,
  TaskItem,
  WeeklySchedule,
} from './types/botchase';

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('inicio');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [botState, setBotState] = useState<BotState | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [coverConfig, setCoverConfig] = useState<CoverConfig | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [credentials, setCredentials] = useState<CredentialsStatus | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Desktop modal & tray state
  const [minimizedToTray, setMinimizedToTray] = useState(false);
  const [showItlaModal, setShowItlaModal] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showOutputExplorer, setShowOutputExplorer] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{
    title: string;
    pdfFile: string;
    docxFile?: string;
    outputDir?: string;
  } | null>(null);

  const loadBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
      const data = (await res.json()) as BootstrapPayload;
      setBotState(data.botState);
      setTasks(data.tasks);
      setCoverConfig(data.coverConfig);
      setProfile(data.profile);
      setSettings(data.settings);
      setCredentials(data.credentials);
      setRecentActivity(data.recentActivity);
      setLogs(data.logs);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error cargando BotChase');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  // Real-time SSE stream for logs, current_step, and task progress
  useEffect(() => {
    const es = new EventSource('/api/stream');

    es.addEventListener('state', (e) => {
      try {
        const nextState = JSON.parse((e as MessageEvent).data) as BotState;
        setBotState(nextState);
      } catch {
        // ignore malformed chunk
      }
    });

    es.addEventListener('tasks', (e) => {
      try {
        const nextTasks = JSON.parse((e as MessageEvent).data) as TaskItem[];
        setTasks(nextTasks);
      } catch {
        // ignore
      }
    });

    es.addEventListener('activity', (e) => {
      try {
        const nextAct = JSON.parse((e as MessageEvent).data) as ActivityEvent[];
        setRecentActivity(nextAct);
      } catch {
        // ignore
      }
    });

    es.addEventListener('log', (e) => {
      try {
        const entry = JSON.parse((e as MessageEvent).data) as LogEntry;
        setLogs((prev) => [...prev.slice(-399), entry]);
      } catch {
        // ignore
      }
    });

    es.addEventListener('logs_cleared', () => {
      setLogs([]);
    });

    return () => {
      es.close();
    };
  }, []);

  // Sync live bot state with native OS System Tray when running in Electron
  useEffect(() => {
    if (window.electronAPI?.isElectron && botState && settings) {
      window.electronAPI.syncTrayState({
        watching: botState.watching,
        currentStep: botState.currentStep,
        minimizeToTray: settings.minimizeToTray,
      });
    }
  }, [botState, settings]);

  // Handlers
  const handleToggleWatch = async () => {
    if (!botState) return;
    const endpoint = botState.watching ? '/api/bot/watch/stop' : '/api/bot/watch/start';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intervalMinutes: botState.intervalMinutes }),
    });
    if (res.ok) {
      const data = await res.json();
      setBotState(data.botState);
    }
  };

  const handleRunOnce = async () => {
    await fetch('/api/bot/run-once', { method: 'POST' });
  };

  const handleConnectItla = async (email: string) => {
    await fetch('/api/bot/connect-itla', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  };

  const handleUpdateInterval = async (intervalMinutes: number) => {
    const res = await fetch('/api/bot/interval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intervalMinutes }),
    });
    if (res.ok) {
      const data = await res.json();
      setBotState(data.botState);
      setSettings((prev) => (prev ? { ...prev, defaultIntervalMinutes: intervalMinutes } : prev));
    }
  };

  const handleToggleScheduleDay = async (day: keyof WeeklySchedule) => {
    if (!botState) return;
    const nextSchedule = {
      ...botState.weeklySchedule,
      [day]: !botState.weeklySchedule[day],
    };
    const res = await fetch('/api/bot/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weeklySchedule: nextSchedule }),
    });
    if (res.ok) {
      setBotState((prev) => (prev ? { ...prev, weeklySchedule: nextSchedule } : prev));
    }
  };

  const handleClearLogs = async () => {
    await fetch('/api/logs/clear', { method: 'POST' });
  };

  const handleImportMoodleHtml = async (html: string) => {
    const res = await fetch('/api/bot/import-html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html }),
    });
    const data = await res.json();
    if (Array.isArray(data.tasks)) {
      setTasks(data.tasks);
    }
    return { added: data.added || 0, ignored: data.ignored || 0 };
  };

  const handleRetryTask = async (cmid: string) => {
    await fetch(`/api/tasks/${encodeURIComponent(cmid)}/retry`, { method: 'POST' });
  };

  const handleSaveCover = async (next: CoverConfig) => {
    const res = await fetch('/api/cover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coverConfig: next }),
    });
    if (res.ok) {
      const data = await res.json();
      setCoverConfig(data.coverConfig);
    }
  };

  const handleSaveProfile = async (next: StudentProfile) => {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: next }),
    });
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
    }
  };

  const handleSaveSettings = async (next: SystemSettings) => {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: next }),
    });
    if (res.ok) {
      const data = await res.json();
      setSettings(data.settings);
      if (data.botState) setBotState(data.botState);
    }
  };

  const handleSelectOutputDir = async (selectedPath: string) => {
    if (!settings) return;
    await handleSaveSettings({ ...settings, outputDir: selectedPath });
  };

  const handleSaveCredentials = async (payload: {
    telegramBotToken?: string;
    telegramChatId?: string;
    moodleUser?: string;
    moodlePass?: string;
  }) => {
    const res = await fetch('/api/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setCredentials(data.credentials);
    }
  };

  const handleTestTelegram = async () => {
    const res = await fetch('/api/telegram/test', { method: 'POST' });
    return (await res.json()) as { ok: boolean; detail: string };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12151E] flex items-center justify-center">
        <div className="text-[14px] text-[#8E98B0]">Cargando entorno de escritorio BotChase...</div>
      </div>
    );
  }

  if (loadError || !botState || !coverConfig || !profile || !settings || !credentials) {
    return (
      <div className="min-h-screen bg-[#12151E] flex items-center justify-center p-6">
        <div className="bg-[#171B26] border border-[#252B3B] rounded-xl p-6 max-w-md space-y-3 text-center">
          <div className="text-[15px] font-semibold text-[#F87171]">
            Error conectando con el proceso local
          </div>
          <p className="text-[13px] text-[#8E98B0]">{loadError || 'Estado no disponible'}</p>
          <button
            type="button"
            onClick={() => void loadBootstrap()}
            className="px-4 py-2 rounded-lg bg-[#6B93F5] text-[#0B101B] text-[13px] font-medium cursor-pointer"
          >
            Reintentar conexión
          </button>
        </div>
      </div>
    );
  }

  if (minimizedToTray) {
    return (
      <SystemTrayDock
        botState={botState}
        onRestore={() => setMinimizedToTray(false)}
        onRunNow={() => void handleRunOnce()}
        onToggleWatch={() => void handleToggleWatch()}
      />
    );
  }

  const pendingCount = tasks.filter(
    (t) => t.status === 'Pendiente' || t.status === 'Error'
  ).length;

  return (
    <div className="min-h-screen bg-[#12151E] text-[#E6EAF2] flex flex-col md:flex-row">
      <Sidebar
        activeSection={activeSection}
        onSelect={setActiveSection}
        profile={profile}
        botState={botState}
        pendingCount={pendingCount}
        onMinimizeToTray={() => {
          if (window.electronAPI?.isElectron) {
            void window.electronAPI.minimizeToTray();
          } else {
            setMinimizedToTray(true);
          }
        }}
      />

      <main className="flex-1 min-w-0 p-6 lg:p-8 max-w-[1360px]">
        {activeSection === 'inicio' && (
          <DashboardView
            botState={botState}
            profile={profile}
            settings={settings}
            recentActivity={recentActivity}
            onToggleWatch={() => void handleToggleWatch()}
            onRunOnce={() => void handleRunOnce()}
            onOpenConnectItla={() => setShowItlaModal(true)}
            onNavigate={setActiveSection}
            onOpenOutputFolder={() => {
              if (window.electronAPI?.isElectron) {
                void window.electronAPI.openFolder(settings.outputDir);
              } else {
                setShowOutputExplorer(true);
              }
            }}
            onToggleScheduleDay={(d) => void handleToggleScheduleDay(d)}
          />
        )}

        {activeSection === 'calendario' && (
          <CalendarWatchView
            botState={botState}
            totalTasks={tasks.length}
            logs={logs}
            onToggleWatch={() => void handleToggleWatch()}
            onRunOnce={() => void handleRunOnce()}
            onOpenConnectItla={() => setShowItlaModal(true)}
            onUpdateInterval={(m) => void handleUpdateInterval(m)}
            onClearLogs={() => void handleClearLogs()}
            onImportMoodleHtml={handleImportMoodleHtml}
          />
        )}

        {activeSection === 'tareas' && (
          <TasksView
            tasks={tasks}
            onOpenPdf={(task) => {
              if (task.pdfFile) {
                const targetDir = task.outputDir || settings.outputDir;
                if (window.electronAPI?.isElectron) {
                  const sep = targetDir.includes('\\') ? '\\' : '/';
                  const fullPath = `${targetDir.replace(/[\\/]+$/, '')}${sep}${task.pdfFile}`;
                  void window.electronAPI.openFile(fullPath).then((opened) => {
                    if (!opened) {
                      setPdfPreview({
                        title: task.title,
                        pdfFile: task.pdfFile!,
                        docxFile: task.docxFile,
                        outputDir: targetDir,
                      });
                    }
                  });
                } else {
                  setPdfPreview({
                    title: task.title,
                    pdfFile: task.pdfFile,
                    docxFile: task.docxFile,
                    outputDir: targetDir,
                  });
                }
              }
            }}
            onRetryTask={(cmid) => void handleRetryTask(cmid)}
            onRunOnce={() => void handleRunOnce()}
          />
        )}

        {activeSection === 'portada' && (
          <CoverStudioView
            coverConfig={coverConfig}
            profile={profile}
            onSaveCover={handleSaveCover}
          />
        )}

        {activeSection === 'perfil' && (
          <ProfileView
            profile={profile}
            primaryColor={coverConfig.primaryColor}
            onSaveProfile={handleSaveProfile}
          />
        )}

        {activeSection === 'ajustes' && (
          <SettingsView
            settings={settings}
            credentials={credentials}
            onSaveSettings={handleSaveSettings}
            onSaveCredentials={handleSaveCredentials}
            onOpenFolderPicker={() => {
              if (window.electronAPI?.isElectron) {
                void window.electronAPI.pickFolder(settings.outputDir).then((chosen) => {
                  if (chosen) {
                    void handleSelectOutputDir(chosen);
                  }
                });
              } else {
                setShowFolderPicker(true);
              }
            }}
            onTestTelegram={handleTestTelegram}
          />
        )}
      </main>

      {/* Modals */}
      {showItlaModal && (
        <ConnectItlaModal
          initialEmail={botState.itlaSessionUser || profile.email}
          useEdge={settings.useSystemEdge}
          onClose={() => setShowItlaModal(false)}
          onConnect={(email) => void handleConnectItla(email)}
        />
      )}

      {showFolderPicker && (
        <FolderPickerModal
          initialPath={settings.outputDir}
          onClose={() => setShowFolderPicker(false)}
          onSelectPath={(path) => void handleSelectOutputDir(path)}
        />
      )}

      {showOutputExplorer && (
        <OutputExplorerModal
          onClose={() => setShowOutputExplorer(false)}
          onPreviewFile={(fileName, dir) => {
            setShowOutputExplorer(false);
            setPdfPreview({
              title: fileName,
              pdfFile: fileName,
              outputDir: dir,
            });
          }}
        />
      )}

      {pdfPreview && (
        <PdfPreviewModal
          title={pdfPreview.title}
          pdfFile={pdfPreview.pdfFile}
          docxFile={pdfPreview.docxFile}
          outputDir={pdfPreview.outputDir}
          onClose={() => setPdfPreview(null)}
        />
      )}
    </div>
  );
}
