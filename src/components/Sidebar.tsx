import React from 'react';
import {
  CalendarClock,
  CheckSquare,
  FileText,
  Home,
  Minimize2,
  Settings,
  User,
} from 'lucide-react';
import type { BotState, NavSection, StudentProfile } from '../types/botchase';
import { getProfileInitials } from './EmblemSvg';

interface SidebarProps {
  activeSection: NavSection;
  onSelect: (section: NavSection) => void;
  profile: StudentProfile;
  botState: BotState;
  pendingCount: number;
  onMinimizeToTray: () => void;
}

const NAV_ITEMS: Array<{ id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'inicio', label: 'Inicio', icon: Home },
  { id: 'calendario', label: 'Calendario', icon: CalendarClock },
  { id: 'tareas', label: 'Tareas', icon: CheckSquare },
  { id: 'portada', label: 'Portada PDF', icon: FileText },
  { id: 'ajustes', label: 'Ajustes', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelect,
  profile,
  botState,
  pendingCount,
  onMinimizeToTray,
}) => {
  const isWorking = botState.status === 'working';
  const isWatching = botState.watching;

  return (
    <aside className="w-[248px] shrink-0 bg-[#0E1117] border-r border-[#252B3B] flex flex-col justify-between h-screen sticky top-0 select-none">
      <div>
        {/* Brand lockup */}
        <div className="px-5 py-5 border-b border-[#252B3B] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#6B93F5]/15 border border-[#6B93F5]/35 flex items-center justify-center text-[#6B93F5] font-bold text-sm shrink-0">
              BC
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold tracking-tight text-[#F3F5FA] truncate">
                BotChase
              </div>
              <div className="text-[11px] text-[#7D879E] truncate">ITLAVIRTUAL Desktop</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onMinimizeToTray}
            title="Minimizar a la bandeja del sistema"
            className="p-1.5 rounded-md text-[#7D879E] hover:text-[#E6EAF2] hover:bg-[#171B26] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#6B93F5]"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Primary 5 navigation sections */}
        <nav aria-label="Navegación principal" className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#6B93F5] ${
                  active
                    ? 'bg-[#6B93F5]/14 text-[#EBF0FF] border border-[#6B93F5]/30'
                    : 'text-[#96A0B5] hover:text-[#E6EAF2] hover:bg-[#171B26] border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#6B93F5]' : 'text-[#7D879E]'}`} />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'tareas' && pendingCount > 0 && (
                  <span className="text-[11px] font-mono tabular-nums text-[#8FA2C9]">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom section: live engine state summary + Perfil anchored bottom-left */}
      <div className="p-3 border-t border-[#252B3B] space-y-2">
        <div className="px-3 py-2 text-[12px] text-[#8E98B0] flex items-center justify-between">
          <span className="flex items-center gap-2 truncate">
            {isWorking ? (
              <span className="w-2 h-2 rounded-full bg-[#6B93F5] animate-pulse shrink-0" />
            ) : isWatching ? (
              <span className="w-2 h-2 rounded-full bg-[#34D399] shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-[#525C75] shrink-0" />
            )}
            <span className="truncate">
              {isWorking ? 'Trabajando' : isWatching ? 'Vigilancia activa' : 'En espera'}
            </span>
          </span>
          <span className="font-mono text-[11px] tabular-nums text-[#6F7991]">
            {botState.intervalMinutes}m
          </span>
        </div>

        <button
          type="button"
          onClick={() => onSelect('perfil')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#6B93F5] ${
            activeSection === 'perfil'
              ? 'bg-[#6B93F5]/14 border border-[#6B93F5]/30'
              : 'hover:bg-[#171B26] border border-transparent'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-[#1E2536] border border-[#2D354A] flex items-center justify-center text-xs font-semibold text-[#C8D4F0] shrink-0 overflow-hidden">
            {profile.logoType === 'upload' && profile.logoDataUrl ? (
              <img src={profile.logoDataUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              getProfileInitials(profile.fullName)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium text-[#E6EAF2] truncate">
              {profile.fullName || 'Perfil'}
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[#7D879E] truncate">
              {profile.matricula || 'Sin matrícula'}
            </div>
          </div>
          <User className="w-3.5 h-3.5 text-[#7D879E] shrink-0" />
        </button>
      </div>
    </aside>
  );
};
