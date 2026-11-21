import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Code2,
  Globe,
  Pause,
  Play,
  RefreshCw,
  Terminal,
  Trash2,
} from 'lucide-react';
import type { BotState, LogEntry, LogLevel } from '../types/botchase';

interface CalendarWatchViewProps {
  botState: BotState;
  totalTasks: number;
  logs: LogEntry[];
  onToggleWatch: () => void;
  onRunOnce: () => void;
  onOpenConnectItla: () => void;
  onUpdateInterval: (minutes: number) => void;
  onClearLogs: () => void;
  onImportMoodleHtml: (html: string) => Promise<{ added: number; ignored: number }>;
}

const PRESET_INTERVALS = [15, 30, 45, 60];

function formatCountdown(nextRunAt: string | null, watching: boolean): string {
  if (!watching || !nextRunAt) return '--:--';
  const diff = Math.max(0, Math.floor((new Date(nextRunAt).getTime() - Date.now()) / 1000));
  const mins = Math.floor(diff / 60);
  const secs = diff % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const CalendarWatchView: React.FC<CalendarWatchViewProps> = ({
  botState,
  totalTasks,
  logs,
  onToggleWatch,
  onRunOnce,
  onOpenConnectItla,
  onUpdateInterval,
  onClearLogs,
  onImportMoodleHtml,
}) => {
  const [customInterval, setCustomInterval] = useState(String(botState.intervalMinutes));
  const [countdown, setCountdown] = useState(() =>
    formatCountdown(botState.nextRunAt, botState.watching)
  );
  const [levelFilter, setLevelFilter] = useState<'ALL' | LogLevel>('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showHtmlImporter, setShowHtmlImporter] = useState(false);
  const [moodleHtml, setMoodleHtml] = useState('');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCustomInterval(String(botState.intervalMinutes));
  }, [botState.intervalMinutes]);

  useEffect(() => {
    setCountdown(formatCountdown(botState.nextRunAt, botState.watching));
    if (!botState.watching || !botState.nextRunAt) return;
    const timer = setInterval(() => {
      setCountdown(formatCountdown(botState.nextRunAt, botState.watching));
    }, 1000);
    return () => clearInterval(timer);
  }, [botState.nextRunAt, botState.watching]);

  const filteredLogs = useMemo(() => {
    if (levelFilter === 'ALL') return logs;
    return logs.filter((l) => l.level === levelFilter);
  }, [logs, levelFilter]);

  useEffect(() => {
    if (autoScroll && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [filteredLogs.length, autoScroll]);

  const handleIntervalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(customInterval);
    if (Number.isFinite(num) && num >= 1 && num <= 720) {
      onUpdateInterval(num);
    }
  };

  const handleImportHtml = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moodleHtml.trim()) return;
    const res = await onImportMoodleHtml(moodleHtml);
    setImportFeedback(
      `Importadas ${res.added} tarea(s) /mod/assign/ (${res.ignored} recursos ignorados).`
    );
    setMoodleHtml('');
  };

  const isWorking = botState.status === 'working';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[#F4F6FB]">Calendario y Vigilancia</h1>
          <p className="text-[13.5px] text-[#8E98B0]">
            Control del ciclo en segundo plano, frecuencia de escaneo y consola en vivo.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowHtmlImporter((v) => !v)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-[#171B26] hover:bg-[#1D2230] text-[#C8D4F0] border border-[#252B3B] cursor-pointer whitespace-nowrap"
        >
          <Code2 className="w-4 h-4 text-[#6B93F5]" />
          <span>{showHtmlImporter ? 'Ocultar importador HTML' : 'Importar HTML Moodle'}</span>
        </button>
      </div>

      {/* Optional real Moodle HTML parser panel */}
      {showHtmlImporter && (
        <form
          onSubmit={handleImportHtml}
          className="bg-[#171B26] border border-[#252B3B] rounded-xl p-5 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[14px] font-semibold text-[#F3F5FA]">
              Analizador directo de HTML ITLAVIRTUAL (filtro estricto /mod/assign/)
            </h2>
            {importFeedback && (
              <span className="text-[12.5px] text-[#34D399]">{importFeedback}</span>
            )}
          </div>
          <textarea
            value={moodleHtml}
            onChange={(e) => setMoodleHtml(e.target.value)}
            rows={4}
            placeholder="Pega aquí el HTML de calendario_upcoming.html o tarea_detalle.html de Moodle..."
            className="w-full rounded-lg bg-[#0E1117] border border-[#252B3B] px-3.5 py-2.5 text-[12.5px] font-mono text-[#D8E0F2] placeholder:text-[#5B647A] focus:outline-none focus:border-[#6B93F5]"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#6B93F5] hover:bg-[#5A82E6] text-[#0B101B] text-[13px] font-medium cursor-pointer"
            >
              Analizar e importar tareas
            </button>
          </div>
        </form>
      )}

      {/* Watch Controller + Interval + Execution Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Controller */}
        <section className="xl:col-span-5 bg-[#171B26] border border-[#252B3B] rounded-xl p-6 flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-[#F3F5FA]">Controlador de vigilancia</h2>
              <span
                className={`text-[12px] font-medium ${
                  isWorking
                    ? 'text-[#6B93F5]'
                    : botState.watching
                    ? 'text-[#34D399]'
                    : 'text-[#8E98B0]'
                }`}
              >
                {isWorking
                  ? 'Ejecutando ciclo'
                  : botState.watching
                  ? 'Vigilancia activa'
                  : 'En espera'}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#12151E] border border-[#252B3B] space-y-1">
              <div className="text-[11.5px] text-[#7D879E]">Estado en vivo (current_step)</div>
              <div className="text-[13.5px] font-medium text-[#E6EAF2] flex items-center gap-2">
                {isWorking && <RefreshCw className="w-3.5 h-3.5 text-[#6B93F5] animate-spin shrink-0" />}
                <span>{botState.currentStep}</span>
              </div>
            </div>

            {botState.lastError && (
              <div className="p-3 rounded-lg bg-[#F87171]/10 border border-[#F87171]/30 flex items-start gap-2.5 text-[12.5px] text-[#FCA5A5]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#F87171]" />
                <span>Último error: {botState.lastError}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenConnectItla}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-[#12151E] hover:bg-[#1D2230] text-[#E6EAF2] border border-[#252B3B] cursor-pointer whitespace-nowrap"
            >
              <Globe className="w-3.5 h-3.5 text-[#6B93F5]" />
              <span>Conectar ITLA</span>
            </button>

            <button
              type="button"
              onClick={onRunOnce}
              disabled={isWorking}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium bg-[#1D2230] hover:bg-[#252C3D] text-[#E6EAF2] border border-[#2D3548] disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isWorking ? 'animate-spin' : ''}`} />
              <span>Revisar ahora</span>
            </button>

            <button
              type="button"
              onClick={onToggleWatch}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium cursor-pointer whitespace-nowrap ${
                botState.watching
                  ? 'bg-[#22293A] hover:bg-[#2B3348] text-[#E6EAF2] border border-[#343D54]'
                  : 'bg-[#6B93F5] hover:bg-[#5A82E6] text-[#0B101B]'
              }`}
            >
              {botState.watching ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{botState.watching ? 'Detener' : 'Activar'}</span>
            </button>
          </div>
        </section>

        {/* Interval Config */}
        <section className="xl:col-span-4 bg-[#171B26] border border-[#252B3B] rounded-xl p-6 flex flex-col justify-between gap-5">
          <div>
            <h2 className="text-[15px] font-semibold text-[#F3F5FA]">Configuración de intervalo</h2>
            <p className="mt-1 text-[13px] text-[#8E98B0]">
              Frecuencia entre ciclos automáticos de vigilancia (1 a 720 minutos).
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {PRESET_INTERVALS.map((m) => {
              const active = botState.intervalMinutes === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onUpdateInterval(m)}
                  className={`py-2 rounded-lg text-[13px] font-mono tabular-nums font-medium border cursor-pointer transition-colors ${
                    active
                      ? 'bg-[#6B93F5]/18 border-[#6B93F5]/45 text-[#EBF0FF]'
                      : 'bg-[#12151E] border-[#252B3B] text-[#9BA5BC] hover:text-[#E6EAF2]'
                  }`}
                >
                  {m}m
                </button>
              );
            })}
          </div>

          <form onSubmit={handleIntervalSubmit} className="flex items-center gap-2">
            <label htmlFor="custom-interval-input" className="text-[12.5px] text-[#8E98B0] shrink-0">
              Personalizado (min):
            </label>
            <input
              id="custom-interval-input"
              type="number"
              min={1}
              max={720}
              value={customInterval}
              onChange={(e) => setCustomInterval(e.target.value)}
              className="w-24 rounded-lg bg-[#12151E] border border-[#252B3B] px-3 py-1.5 text-[13px] font-mono tabular-nums text-[#E6EAF2] focus:outline-none focus:border-[#6B93F5]"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-[#1D2230] hover:bg-[#252C3D] border border-[#2D3548] text-[12.5px] font-medium text-[#E6EAF2] cursor-pointer whitespace-nowrap"
            >
              Aplicar
            </button>
          </form>
        </section>

        {/* Execution Summary */}
        <section className="xl:col-span-3 bg-[#171B26] border border-[#252B3B] rounded-xl p-6 flex flex-col justify-between">
          <h2 className="text-[15px] font-semibold text-[#F3F5FA]">Resumen de ejecución</h2>

          <div className="mt-4 space-y-3.5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#8E98B0]">Próxima revisión</span>
              <span className="font-mono tabular-nums text-[15px] font-semibold text-[#6B93F5]">
                {countdown}
              </span>
            </div>

            <div className="pt-3 border-t border-[#252B3B] flex items-center justify-between text-[13px]">
              <span className="text-[#8E98B0]">Última revisión</span>
              <span className="font-mono tabular-nums text-[#D4DCF0]">
                {botState.lastRunAt
                  ? new Date(botState.lastRunAt).toLocaleTimeString('es-DO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Pendiente'}
              </span>
            </div>

            <div className="pt-3 border-t border-[#252B3B] flex items-center justify-between text-[13px]">
              <span className="text-[#8E98B0]">Concurrencia activa</span>
              <span className="font-mono tabular-nums text-[#D4DCF0]">
                {botState.activeThreads} / {botState.kpis.geminiThreads} hilos
              </span>
            </div>

            <div className="pt-3 border-t border-[#252B3B] flex items-center justify-between text-[13px]">
              <span className="text-[#8E98B0]">Tareas registradas</span>
              <span className="font-mono tabular-nums text-[#D4DCF0]">{totalTasks}</span>
            </div>
          </div>
        </section>
      </div>

      {/* Live Logs Console (Mandatory) */}
      <section className="bg-[#171B26] border border-[#252B3B] rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#252B3B] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-[#6B93F5]" />
            <h2 className="text-[14px] font-semibold text-[#F3F5FA]">Consola de logs en vivo</h2>
            <span className="text-[12px] font-mono tabular-nums text-[#7D879E]">
              {filteredLogs.length} entradas
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-0.5 bg-[#12151E] border border-[#252B3B] rounded-lg">
              {(['ALL', 'INFO', 'WARNING', 'ERROR'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevelFilter(lvl)}
                  className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium cursor-pointer transition-colors ${
                    levelFilter === lvl
                      ? 'bg-[#6B93F5]/20 text-[#EBF0FF]'
                      : 'text-[#8E98B0] hover:text-[#E6EAF2]'
                  }`}
                >
                  {lvl === 'ALL' ? 'Todos' : lvl}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setAutoScroll((v) => !v)}
              className={`px-2.5 py-1 rounded-lg text-[11.5px] border cursor-pointer ${
                autoScroll
                  ? 'bg-[#6B93F5]/14 border-[#6B93F5]/35 text-[#D8E3FF]'
                  : 'bg-[#12151E] border-[#252B3B] text-[#8E98B0]'
              }`}
            >
              Auto-scroll
            </button>

            <button
              type="button"
              onClick={onClearLogs}
              title="Limpiar consola"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] bg-[#12151E] hover:bg-[#1E2332] border border-[#252B3B] text-[#9BA5BC] cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          </div>
        </div>

        <div className="bg-[#0B0E14] h-[320px] overflow-y-auto p-4 font-mono text-[12px] leading-relaxed space-y-1.5">
          {filteredLogs.length === 0 ? (
            <div className="text-[#5E6880] py-8 text-center">
              Sin registros de ejecución para el filtro seleccionado.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const levelClass =
                log.level === 'ERROR'
                  ? 'text-[#F87171]'
                  : log.level === 'WARNING'
                  ? 'text-[#FBBF24]'
                  : 'text-[#6B93F5]';
              return (
                <div key={log.id} className="flex items-start gap-2.5 break-words">
                  <span className="text-[#5B647A] tabular-nums shrink-0">{log.timestamp}</span>
                  <span className={`${levelClass} font-semibold w-[62px] shrink-0`}>
                    {log.level}
                  </span>
                  <span className="text-[#8894AE] shrink-0">[{log.source}]</span>
                  <span className="text-[#D8E0F2]">{log.message}</span>
                </div>
              );
            })
          )}
          <div ref={consoleEndRef} />
        </div>
      </section>
    </div>
  );
};
