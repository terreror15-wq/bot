import React from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileText,
  FolderOpen,
  Globe,
  Palette,
  Pause,
  Play,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import type {
  ActivityEvent,
  BotState,
  NavSection,
  StudentProfile,
  SystemSettings,
  WeeklySchedule,
} from '../types/botchase';

interface DashboardViewProps {
  botState: BotState;
  profile: StudentProfile;
  settings: SystemSettings;
  recentActivity: ActivityEvent[];
  onToggleWatch: () => void;
  onRunOnce: () => void;
  onOpenConnectItla: () => void;
  onNavigate: (section: NavSection) => void;
  onOpenOutputFolder: () => void;
  onToggleScheduleDay: (day: keyof WeeklySchedule) => void;
}

const WEEK_DAYS: Array<{ key: keyof WeeklySchedule; label: string; full: string }> = [
  { key: 'L', label: 'L', full: 'Lunes' },
  { key: 'M', label: 'M', full: 'Martes' },
  { key: 'X', label: 'X', full: 'Miércoles' },
  { key: 'J', label: 'J', full: 'Jueves' },
  { key: 'V', label: 'V', full: 'Viernes' },
  { key: 'S', label: 'S', full: 'Sábado' },
  { key: 'D', label: 'D', full: 'Domingo' },
];

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'Sin ejecución previa';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  botState,
  profile,
  settings,
  recentActivity,
  onToggleWatch,
  onRunOnce,
  onOpenConnectItla,
  onNavigate,
  onOpenOutputFolder,
  onToggleScheduleDay,
}) => {
  const isWorking = botState.status === 'working';
  const isWatching = botState.watching;

  const statusText = isWorking
    ? 'Trabajando ahora'
    : isWatching
    ? 'Vigilancia activa'
    : botState.status === 'error'
    ? 'Atención requerida'
    : 'En espera';

  return (
    <div className="space-y-6">
      {/* Hero Card + Schedule Card */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Hero Card */}
        <section className="xl:col-span-8 bg-[#171B26] border border-[#252B3B] rounded-xl p-6 flex flex-col justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-[12.5px] text-[#8E98B0]">
                <span>{profile.fullName}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-[#B4C0DA]">{profile.matricula}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {botState.itlaConnected
                    ? `ITLA conectado (${botState.itlaSessionUser})`
                    : 'Sesión ITLA pendiente'}
                </span>
              </div>

              <div
                className={`flex items-center gap-2 text-[12.5px] font-medium ${
                  isWorking
                    ? 'text-[#6B93F5]'
                    : isWatching
                    ? 'text-[#34D399]'
                    : botState.status === 'error'
                    ? 'text-[#F87171]'
                    : 'text-[#9CA6BC]'
                }`}
              >
                {isWorking ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : isWatching ? (
                  <Activity className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{statusText}</span>
              </div>
            </div>

            <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-[#F4F6FB] text-balance">
              Automatización de tareas ITLAVIRTUAL
            </h1>

            <div className="pt-1 flex items-center gap-2.5 text-[13.5px] text-[#AEB7CA]">
              <span className="text-[#7D879E]">Paso actual:</span>
              <span className="font-medium text-[#E6EAF2]">{botState.currentStep}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#252B3B] flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onToggleWatch}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13.5px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#6B93F5] ${
                isWatching
                  ? 'bg-[#22293A] hover:bg-[#2B3348] text-[#E6EAF2] border border-[#343D54]'
                  : 'bg-[#6B93F5] hover:bg-[#5A82E6] text-[#0B101B]'
              }`}
            >
              {isWatching ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isWatching ? 'Detener vigilancia' : 'Activar vigilancia'}</span>
            </button>

            <button
              type="button"
              onClick={onRunOnce}
              disabled={isWorking}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13.5px] font-medium bg-[#1D2230] hover:bg-[#252C3D] text-[#E6EAF2] border border-[#2D3548] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#6B93F5]"
            >
              <RefreshCw className={`w-4 h-4 ${isWorking ? 'animate-spin text-[#6B93F5]' : ''}`} />
              <span>Revisar ahora</span>
            </button>

            <button
              type="button"
              onClick={onOpenConnectItla}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13.5px] font-medium bg-transparent hover:bg-[#1D2230] text-[#B9C4DC] border border-[#252B3B] transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#6B93F5]"
            >
              <Globe className="w-4 h-4 text-[#6B93F5]" />
              <span>Conectar ITLA</span>
            </button>
          </div>
        </section>

        {/* Schedule Card */}
        <section className="xl:col-span-4 bg-[#171B26] border border-[#252B3B] rounded-xl p-6 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-[#F3F5FA]">Programación semanal</h2>
              <span className="font-mono text-[12px] tabular-nums text-[#6B93F5]">
                Cada {botState.intervalMinutes} min
              </span>
            </div>
            <p className="mt-1.5 text-[13px] text-[#8E98B0]">
              {isWatching
                ? 'Revisión periódica en segundo plano habilitada.'
                : 'Ejecución bajo demanda; activa los días deseados.'}
            </p>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {WEEK_DAYS.map((day) => {
              const active = botState.weeklySchedule[day.key];
              return (
                <button
                  key={day.key}
                  type="button"
                  title={`${day.full}: ${active ? 'Activo' : 'Inactivo'}`}
                  onClick={() => onToggleScheduleDay(day.key)}
                  className={`h-10 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer border focus-visible:outline-2 focus-visible:outline-[#6B93F5] ${
                    active
                      ? 'bg-[#6B93F5]/18 border-[#6B93F5]/45 text-[#EBF0FF]'
                      : 'bg-[#12151E] border-[#252B3B] text-[#6E778E] hover:text-[#B4C0DA]'
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#252B3B] flex items-center justify-between text-[12.5px] text-[#8E98B0]">
            <span>Última revisión</span>
            <span className="font-mono tabular-nums text-[#D4DCF0]">
              {formatRelativeTime(botState.lastRunAt)}
            </span>
          </div>
        </section>
      </div>

      {/* 4 KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#171B26] border border-[#252B3B] rounded-xl p-5">
          <div className="text-[12.5px] text-[#8E98B0]">PDFs generados</div>
          <div className="mt-2 text-[28px] font-semibold font-mono tabular-nums text-[#F4F6FB]">
            {botState.kpis.pdfsGenerated}
          </div>
          <div className="mt-1 text-[12px] text-[#6F7991] truncate">
            En {settings.outputDir.split('/').pop() || 'Tareas pendientes'}
          </div>
        </div>

        <div className="bg-[#171B26] border border-[#252B3B] rounded-xl p-5">
          <div className="text-[12.5px] text-[#8E98B0]">Avisos manuales</div>
          <div className="mt-2 text-[28px] font-semibold font-mono tabular-nums text-[#F4F6FB]">
            {botState.kpis.manualAlerts}
          </div>
          <div className="mt-1 text-[12px] text-[#6F7991]">Clasificadas para Telegram</div>
        </div>

        <div className="bg-[#171B26] border border-[#252B3B] rounded-xl p-5">
          <div className="text-[12.5px] text-[#8E98B0]">Frecuencia</div>
          <div className="mt-2 text-[28px] font-semibold font-mono tabular-nums text-[#F4F6FB]">
            {botState.kpis.frequencyMinutes} min
          </div>
          <div className="mt-1 text-[12px] text-[#6F7991]">
            {isWatching ? 'Ciclo automático activo' : 'Esperando activación'}
          </div>
        </div>

        <div className="bg-[#171B26] border border-[#252B3B] rounded-xl p-5">
          <div className="text-[12.5px] text-[#8E98B0]">Hilos Gemini</div>
          <div className="mt-2 text-[28px] font-semibold font-mono tabular-nums text-[#F4F6FB]">
            {botState.kpis.geminiThreads}
          </div>
          <div className="mt-1 text-[12px] text-[#6F7991] font-mono tabular-nums">
            {botState.activeThreads} activo(s) ahora
          </div>
        </div>
      </section>

      {/* Bottom 2-column split: Quick Actions (2x2) + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Quick Actions 2x2 */}
        <section className="lg:col-span-5 bg-[#171B26] border border-[#252B3B] rounded-xl p-6">
          <h2 className="text-[15px] font-semibold text-[#F3F5FA]">Acciones rápidas</h2>
          <p className="mt-1 text-[13px] text-[#8E98B0]">
            Accesos directos a configuración y archivos compilados.
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onNavigate('calendario')}
              className="p-4 rounded-lg bg-[#12151E] hover:bg-[#1B202E] border border-[#252B3B] text-left transition-colors cursor-pointer group focus-visible:outline-2 focus-visible:outline-[#6B93F5]"
            >
              <CalendarClock className="w-4 h-4 text-[#6B93F5]" />
              <div className="mt-3 text-[13.5px] font-medium text-[#E6EAF2]">
                Configurar calendario
              </div>
              <div className="mt-0.5 text-[12px] text-[#7D879E]">Intervalos y consola en vivo</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('portada')}
              className="p-4 rounded-lg bg-[#12151E] hover:bg-[#1B202E] border border-[#252B3B] text-left transition-colors cursor-pointer group focus-visible:outline-2 focus-visible:outline-[#6B93F5]"
            >
              <Palette className="w-4 h-4 text-[#6B93F5]" />
              <div className="mt-3 text-[13.5px] font-medium text-[#E6EAF2]">
                Personalizar portada
              </div>
              <div className="mt-0.5 text-[12px] text-[#7D879E]">Estudio PDF y estilos</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('perfil')}
              className="p-4 rounded-lg bg-[#12151E] hover:bg-[#1B202E] border border-[#252B3B] text-left transition-colors cursor-pointer group focus-visible:outline-2 focus-visible:outline-[#6B93F5]"
            >
              <UserCheck className="w-4 h-4 text-[#6B93F5]" />
              <div className="mt-3 text-[13.5px] font-medium text-[#E6EAF2]">
                Cambiar nombre y logo
              </div>
              <div className="mt-0.5 text-[12px] text-[#7D879E]">Datos y emblema académico</div>
            </button>

            <button
              type="button"
              onClick={onOpenOutputFolder}
              className="p-4 rounded-lg bg-[#12151E] hover:bg-[#1B202E] border border-[#252B3B] text-left transition-colors cursor-pointer group focus-visible:outline-2 focus-visible:outline-[#6B93F5]"
            >
              <FolderOpen className="w-4 h-4 text-[#6B93F5]" />
              <div className="mt-3 text-[13.5px] font-medium text-[#E6EAF2]">
                Abrir carpeta PDFs
              </div>
              <div className="mt-0.5 text-[12px] text-[#7D879E] truncate">{settings.outputDir}</div>
            </button>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="lg:col-span-7 bg-[#171B26] border border-[#252B3B] rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-[#F3F5FA]">Actividad reciente</h2>
            <button
              type="button"
              onClick={() => onNavigate('tareas')}
              className="text-[12.5px] text-[#6B93F5] hover:underline cursor-pointer whitespace-nowrap"
            >
              Ver todas las tareas
            </button>
          </div>

          {recentActivity.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-[#7D879E]">
              Aún no hay eventos registrados en esta sesión.
            </div>
          ) : (
            <div className="mt-4 divide-y divide-[#252B3B]">
              {recentActivity.slice(0, 6).map((evt) => (
                <div key={evt.id} className="py-3 first:pt-1 last:pb-0 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {evt.kind === 'error' ? (
                        <AlertTriangle className="w-4 h-4 text-[#F87171]" />
                      ) : evt.kind === 'pdf' ? (
                        <FileText className="w-4 h-4 text-[#34D399]" />
                      ) : (
                        <Activity className="w-4 h-4 text-[#6B93F5]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-medium text-[#E6EAF2] truncate">
                        {evt.title}
                      </div>
                      <div className="text-[12.5px] text-[#8E98B0] truncate">{evt.detail}</div>
                    </div>
                  </div>
                  <span className="text-[11.5px] font-mono tabular-nums text-[#6F7991] shrink-0">
                    {new Date(evt.timestamp).toLocaleTimeString('es-DO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
