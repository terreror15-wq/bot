import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Clock,
  FileCheck2,
  FileText,
  MinusCircle,
  RefreshCw,
  RotateCw,
  Search,
} from 'lucide-react';
import type { TaskItem } from '../types/botchase';

interface TasksViewProps {
  tasks: TaskItem[];
  onOpenPdf: (task: TaskItem) => void;
  onRetryTask: (cmid: string) => void;
  onRunOnce: () => void;
}

type FilterTab = 'Todas' | 'PDF' | 'Manual' | 'Error';

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onOpenPdf,
  onRetryTask,
  onRunOnce,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterTab>('Todas');

  const sortedAndFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...tasks]
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .filter((t) => {
        if (filter === 'PDF') {
          return t.classification === 'PDF' || t.status === 'PDF listo';
        }
        if (filter === 'Manual') {
          return t.classification === 'Manual' || t.status === 'Aviso manual';
        }
        if (filter === 'Error') {
          return t.status === 'Error';
        }
        return true;
      })
      .filter((t) => {
        if (!q) return true;
        return (
          t.cmid.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q)
        );
      });
  }, [tasks, query, filter]);

  const counts = useMemo(() => {
    return {
      Todas: tasks.length,
      PDF: tasks.filter((t) => t.classification === 'PDF' || t.status === 'PDF listo').length,
      Manual: tasks.filter((t) => t.classification === 'Manual' || t.status === 'Aviso manual').length,
      Error: tasks.filter((t) => t.status === 'Error').length,
    };
  }, [tasks]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[#F4F6FB]">Tareas detectadas</h1>
          <p className="text-[13.5px] text-[#8E98B0]">
            Ordenadas por fecha de entrega más cercana; solo actividades /mod/assign/view.php.
          </p>
        </div>

        <button
          type="button"
          onClick={onRunOnce}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium bg-[#171B26] hover:bg-[#1E2433] text-[#E6EAF2] border border-[#252B3B] cursor-pointer whitespace-nowrap"
        >
          <RefreshCw className="w-4 h-4 text-[#6B93F5]" />
          <span>Escanear calendario</span>
        </button>
      </div>

      {/* Search + Segmented Filters */}
      <div className="bg-[#171B26] border border-[#252B3B] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#6F7991] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por #CMID, materia o título de tarea..."
            className="w-full rounded-lg bg-[#12151E] border border-[#252B3B] pl-10 pr-4 py-2 text-[13.5px] text-[#E6EAF2] placeholder:text-[#65708A] focus:outline-none focus:border-[#6B93F5]"
          />
        </div>

        <div className="flex items-center p-1 bg-[#12151E] border border-[#252B3B] rounded-lg">
          {(['Todas', 'PDF', 'Manual', 'Error'] as FilterTab[]).map((tab) => {
            const active = filter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#6B93F5]/20 text-[#EBF0FF]'
                    : 'text-[#8E98B0] hover:text-[#E6EAF2]'
                }`}
              >
                <span>{tab}</span>
                <span className="font-mono tabular-nums text-[11px] text-[#7D879E]">
                  {counts[tab]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Task List */}
      {sortedAndFiltered.length === 0 ? (
        <div className="bg-[#171B26] border border-[#252B3B] rounded-xl p-12 text-center space-y-3">
          <div className="text-[15px] font-medium text-[#E6EAF2]">
            No hay tareas que coincidan con tu búsqueda
          </div>
          <p className="text-[13px] text-[#8E98B0] max-w-md mx-auto">
            Prueba cambiando el filtro de estado o ejecuta una revisión del calendario de ITLAVIRTUAL.
          </p>
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setFilter('Todas');
              }}
              className="px-4 py-2 rounded-lg text-[13px] font-medium bg-[#1D2230] text-[#E6EAF2] border border-[#2D3548] cursor-pointer"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#171B26] border border-[#252B3B] rounded-xl divide-y divide-[#252B3B]">
          {sortedAndFiltered.map((task) => {
            const isPdfReady = task.status === 'PDF listo' && Boolean(task.pdfFile);
            const isProcessing = task.status === 'Procesando';

            return (
              <article
                key={task.cmid}
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#1B202C]/60 transition-colors"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  {/* Quiet typographic metadata row (zero pills) */}
                  <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-[#8E98B0]">
                    <span className="font-mono tabular-nums text-[#6B93F5] font-medium">
                      #{task.cmid}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#C8D1E6] font-medium">{task.subject}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{task.dueLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>Clasificación: {task.classification}</span>
                  </div>

                  <h3 className="text-[15.5px] font-semibold text-[#F4F6FB] leading-snug">
                    {task.title}
                  </h3>

                  <p className="text-[13px] text-[#96A0B5] leading-relaxed">
                    {task.errorMessage ? `Error: ${task.errorMessage}` : task.reason}
                  </p>
                </div>

                {/* Status indicator + Action buttons */}
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5 text-[12.5px] font-medium min-w-[116px]">
                    {task.status === 'PDF listo' && (
                      <>
                        <FileCheck2 className="w-4 h-4 text-[#34D399]" />
                        <span className="text-[#34D399]">PDF listo</span>
                      </>
                    )}
                    {task.status === 'Aviso manual' && (
                      <>
                        <Bell className="w-4 h-4 text-[#FBBF24]" />
                        <span className="text-[#FBBF24]">Aviso manual</span>
                      </>
                    )}
                    {task.status === 'Error' && (
                      <>
                        <AlertTriangle className="w-4 h-4 text-[#F87171]" />
                        <span className="text-[#F87171]">Error</span>
                      </>
                    )}
                    {task.status === 'Omitida' && (
                      <>
                        <MinusCircle className="w-4 h-4 text-[#7D879E]" />
                        <span className="text-[#8E98B0]">Omitida</span>
                      </>
                    )}
                    {task.status === 'Pendiente' && (
                      <>
                        <Clock className="w-4 h-4 text-[#6B93F5]" />
                        <span className="text-[#9DB8FA]">Pendiente</span>
                      </>
                    )}
                    {isProcessing && (
                      <>
                        <RefreshCw className="w-4 h-4 text-[#6B93F5] animate-spin" />
                        <span className="text-[#6B93F5]">Procesando</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!isPdfReady}
                      onClick={() => onOpenPdf(task)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-medium bg-[#6B93F5] hover:bg-[#5A82E6] text-[#0B101B] disabled:bg-[#1D2230] disabled:text-[#5B647A] disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Abrir PDF</span>
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing || task.status === 'Omitida'}
                      onClick={() => onRetryTask(task.cmid)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-medium bg-[#12151E] hover:bg-[#1E2433] text-[#D8E0F2] border border-[#252B3B] disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                      <span>Reintentar</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
