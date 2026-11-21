import React, { useState } from 'react';
import { Check, Save } from 'lucide-react';
import type {
  CoverConfig,
  CoverStyle,
  CoverVisibleFields,
  LogoSize,
  StudentProfile,
} from '../types/botchase';
import { ProfileLogoMark } from './EmblemSvg';

interface CoverStudioViewProps {
  coverConfig: CoverConfig;
  profile: StudentProfile;
  onSaveCover: (next: CoverConfig) => Promise<void>;
}

const COVER_STYLES: Array<{ id: CoverStyle; name: string; desc: string }> = [
  { id: 'clasica', name: 'Clásica Institucional', desc: 'Banda superior y línea inferior' },
  { id: 'minimalista', name: 'Minimalista Moderna', desc: 'Acento superior limpio y aireado' },
  { id: 'ejecutiva', name: 'Ejecutiva Bicolor', desc: 'Columna lateral vertical de color' },
  { id: 'editorial', name: 'Editorial Enmarcada', desc: 'Marco doble formal completo' },
];

const COLOR_PRESETS: Array<{ name: string; primary: string; accent: string }> = [
  { name: 'Azul ITLA', primary: '#1E3A8A', accent: '#6B93F5' },
  { name: 'Grafito Formal', primary: '#1E293B', accent: '#475569' },
  { name: 'Esmeralda Académica', primary: '#065F46', accent: '#10B981' },
  { name: 'Borgoña Rectoral', primary: '#7F1D1D', accent: '#B91C1C' },
];

const FIELD_TOGGLES: Array<{ key: keyof CoverVisibleFields; label: string }> = [
  { key: 'institucion', label: 'Institución' },
  { key: 'carrera', label: 'Carrera / Facultad' },
  { key: 'asignatura', label: 'Asignatura' },
  { key: 'titulo', label: 'Título' },
  { key: 'sustentante', label: 'Sustentante' },
  { key: 'matricula', label: 'Matrícula' },
  { key: 'docente', label: 'Docente' },
  { key: 'seccion', label: 'Sección / Código' },
  { key: 'fecha', label: 'Fecha de entrega' },
  { key: 'indiceTematico', label: 'Índice Temático (Pág. 2)' },
  { key: 'paginaUno', label: 'Mostrar "Página 1" en portada' },
];

export const CoverStudioView: React.FC<CoverStudioViewProps> = ({
  coverConfig,
  profile,
  onSaveCover,
}) => {
  const [draft, setDraft] = useState<CoverConfig>(coverConfig);
  const [previewPage, setPreviewPage] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const toggleField = (key: keyof CoverVisibleFields) => {
    setDraft((prev) => ({
      ...prev,
      fields: { ...prev.fields, [key]: !prev.fields[key] },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveCover(draft);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const logoSizePx = draft.logoSize === 'small' ? 46 : draft.logoSize === 'large' ? 84 : 64;
  const previewFontClass = draft.fontFamily === 'serif' ? 'font-serif' : 'font-sans';

  const todayLabel = new Date().toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[#F4F6FB]">Estudio de Portada PDF</h1>
          <p className="text-[13.5px] text-[#8E98B0]">
            Personaliza la plantilla real utilizada por el compilador de PDF y DOCX.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13.5px] font-medium bg-[#6B93F5] hover:bg-[#5A82E6] text-[#0B101B] disabled:opacity-60 cursor-pointer whitespace-nowrap"
        >
          {savedNotice ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{savedNotice ? 'Plantilla exportada' : saving ? 'Guardando...' : 'Guardar plantilla'}</span>
        </button>
      </div>

      {/* 2-Column Split: Left Editor, Right Live Cover Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Controls */}
        <div className="xl:col-span-6 space-y-5">
          {/* 4 Cover Styles */}
          <section className="bg-[#171B26] border border-[#252B3B] rounded-xl p-5 space-y-3">
            <h2 className="text-[14.5px] font-semibold text-[#F3F5FA]">Estilo de portada</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {COVER_STYLES.map((st) => {
                const active = draft.style === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, style: st.id }))}
                    className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#6B93F5]/14 border-[#6B93F5]/50 text-[#F3F5FA]'
                        : 'bg-[#12151E] border-[#252B3B] text-[#9BA5BC] hover:text-[#E6EAF2]'
                    }`}
                  >
                    <div className="text-[13px] font-semibold">{st.name}</div>
                    <div className="text-[11.5px] text-[#7D879E] mt-0.5">{st.desc}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Palette, Font, Logo Size */}
          <section className="bg-[#171B26] border border-[#252B3B] rounded-xl p-5 space-y-4">
            <h2 className="text-[14.5px] font-semibold text-[#F3F5FA]">Color y tipografía</h2>

            <div className="space-y-2">
              <div className="text-[12.5px] text-[#8E98B0]">Paletas sugeridas</div>
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_PRESETS.map((preset) => {
                  const active =
                    draft.primaryColor.toLowerCase() === preset.primary.toLowerCase() &&
                    draft.accentColor.toLowerCase() === preset.accent.toLowerCase();
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          primaryColor: preset.primary,
                          accentColor: preset.accent,
                        }))
                      }
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] border cursor-pointer ${
                        active
                          ? 'bg-[#6B93F5]/14 border-[#6B93F5]/45 text-[#F3F5FA]'
                          : 'bg-[#12151E] border-[#252B3B] text-[#9BA5BC]'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span>{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <label className="space-y-1.5">
                <span className="text-[12px] text-[#8E98B0] block">Color principal</span>
                <div className="flex items-center gap-2 bg-[#12151E] border border-[#252B3B] rounded-lg px-2.5 py-1.5">
                  <input
                    type="color"
                    value={draft.primaryColor}
                    onChange={(e) => setDraft((p) => ({ ...p, primaryColor: e.target.value }))}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-[12px] text-[#D8E0F2]">{draft.primaryColor}</span>
                </div>
              </label>

              <label className="space-y-1.5">
                <span className="text-[12px] text-[#8E98B0] block">Color de acento</span>
                <div className="flex items-center gap-2 bg-[#12151E] border border-[#252B3B] rounded-lg px-2.5 py-1.5">
                  <input
                    type="color"
                    value={draft.accentColor}
                    onChange={(e) => setDraft((p) => ({ ...p, accentColor: e.target.value }))}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="font-mono text-[12px] text-[#D8E0F2]">{draft.accentColor}</span>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <div className="text-[12px] text-[#8E98B0] mb-1.5">Tipografía</div>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#12151E] border border-[#252B3B] rounded-lg">
                  <button
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, fontFamily: 'sans' }))}
                    className={`py-1.5 rounded-md text-[12.5px] font-medium cursor-pointer ${
                      draft.fontFamily === 'sans'
                        ? 'bg-[#6B93F5]/20 text-[#EBF0FF]'
                        : 'text-[#8E98B0]'
                    }`}
                  >
                    Sans Moderna
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, fontFamily: 'serif' }))}
                    className={`py-1.5 rounded-md text-[12.5px] font-serif font-medium cursor-pointer ${
                      draft.fontFamily === 'serif'
                        ? 'bg-[#6B93F5]/20 text-[#EBF0FF]'
                        : 'text-[#8E98B0]'
                    }`}
                  >
                    Serif Académica
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[12px] text-[#8E98B0] mb-1.5">Tamaño del logo</div>
                <div className="grid grid-cols-3 gap-1 p-1 bg-[#12151E] border border-[#252B3B] rounded-lg">
                  {(
                    [
                      { id: 'small', label: 'Pequeño' },
                      { id: 'medium', label: 'Mediano' },
                      { id: 'large', label: 'Grande' },
                    ] as Array<{ id: LogoSize; label: string }>
                  ).map((sz) => (
                    <button
                      key={sz.id}
                      type="button"
                      onClick={() => setDraft((p) => ({ ...p, logoSize: sz.id }))}
                      className={`py-1.5 rounded-md text-[12px] font-medium cursor-pointer ${
                        draft.logoSize === sz.id
                          ? 'bg-[#6B93F5]/20 text-[#EBF0FF]'
                          : 'text-[#8E98B0]'
                      }`}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="text-[12px] text-[#8E98B0] block">Texto superior</span>
                <input
                  type="text"
                  value={draft.headerText}
                  onChange={(e) => setDraft((p) => ({ ...p, headerText: e.target.value }))}
                  className="w-full rounded-lg bg-[#12151E] border border-[#252B3B] px-3 py-2 text-[12.5px] text-[#E6EAF2] focus:outline-none focus:border-[#6B93F5]"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-[12px] text-[#8E98B0] block">Pie de portada</span>
                <input
                  type="text"
                  value={draft.footerText}
                  onChange={(e) => setDraft((p) => ({ ...p, footerText: e.target.value }))}
                  className="w-full rounded-lg bg-[#12151E] border border-[#252B3B] px-3 py-2 text-[12.5px] text-[#E6EAF2] focus:outline-none focus:border-[#6B93F5]"
                />
              </label>
            </div>
          </section>

          {/* Field Toggles */}
          <section className="bg-[#171B26] border border-[#252B3B] rounded-xl p-5 space-y-3">
            <h2 className="text-[14.5px] font-semibold text-[#F3F5FA]">Campos visibles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FIELD_TOGGLES.map((f) => {
                const enabled = draft.fields[f.key];
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => toggleField(f.key)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#12151E] border border-[#252B3B] text-left cursor-pointer hover:border-[#343D54] transition-colors"
                  >
                    <span className="text-[12.5px] text-[#D8E0F2]">{f.label}</span>
                    <span
                      className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${
                        enabled ? 'bg-[#6B93F5]' : 'bg-[#2A3142]'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          enabled ? 'left-[18px]' : 'left-0.5'
                        }`}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right: Live Sheet Preview */}
        <div className="xl:col-span-6 sticky top-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#9BA5BC]">
              Vista previa en vivo (Tamaño Carta)
            </span>
            {draft.fields.indiceTematico && (
              <div className="flex items-center p-0.5 bg-[#171B26] border border-[#252B3B] rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewPage(1)}
                  className={`px-3 py-1 rounded-md text-[12px] font-medium cursor-pointer ${
                    previewPage === 1 ? 'bg-[#6B93F5]/20 text-[#EBF0FF]' : 'text-[#8E98B0]'
                  }`}
                >
                  Portada (Pág. 1)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPage(2)}
                  className={`px-3 py-1 rounded-md text-[12px] font-medium cursor-pointer ${
                    previewPage === 2 ? 'bg-[#6B93F5]/20 text-[#EBF0FF]' : 'text-[#8E98B0]'
                  }`}
                >
                  Índice (Pág. 2)
                </button>
              </div>
            )}
          </div>

          {/* White Paper Sheet */}
          <div
            className={`bg-white text-slate-900 rounded-lg shadow-xl overflow-hidden aspect-[8.5/11] w-full max-w-[540px] mx-auto relative flex flex-col justify-between ${previewFontClass}`}
          >
            {previewPage === 2 && draft.fields.indiceTematico ? (
              <div className="p-10 h-full flex flex-col justify-between">
                <div>
                  <h3
                    className="text-[18px] font-bold pb-2 border-b-2"
                    style={{ color: draft.primaryColor, borderColor: draft.accentColor }}
                  >
                    Índice Temático
                  </h3>
                  <ul className="mt-6 space-y-3 text-[13px] text-slate-700">
                    {[
                      ['Resumen Ejecutivo', 'Pág. 3'],
                      ['1. Introducción y planteamiento del problema', 'Pág. 3'],
                      ['2. Desarrollo teórico y arquitectura propuesta', 'Pág. 4'],
                      ['3. Análisis comparativo y casos de uso', 'Pág. 5'],
                      ['Conclusiones', 'Pág. 6'],
                      ['Referencias Bibliográficas (APA)', 'Pág. 6'],
                    ].map(([item, pg]) => (
                      <li
                        key={item}
                        className="flex items-center justify-between border-b border-dashed border-slate-200 pb-1.5"
                      >
                        <span>{item}</span>
                        <span className="font-mono text-[12px] text-slate-500">{pg}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-[10.5px] text-slate-400 text-center">
                  {profile.institution} · Página 2
                </div>
              </div>
            ) : (
              <>
                {/* Style Framing */}
                {draft.style === 'clasica' && (
                  <div className="h-3 w-full" style={{ backgroundColor: draft.primaryColor }} />
                )}
                {draft.style === 'ejecutiva' && (
                  <>
                    <div
                      className="absolute inset-y-0 left-0 w-5"
                      style={{ backgroundColor: draft.primaryColor }}
                    />
                    <div
                      className="absolute inset-y-0 left-5 w-1"
                      style={{ backgroundColor: draft.accentColor }}
                    />
                  </>
                )}

                <div
                  className={`flex-1 flex flex-col justify-between p-9 ${
                    draft.style === 'ejecutiva' ? 'pl-12' : ''
                  } ${draft.style === 'editorial' ? 'm-5 border-2' : ''}`}
                  style={
                    draft.style === 'editorial' ? { borderColor: draft.primaryColor } : undefined
                  }
                >
                  {/* Header + Logo + Institution */}
                  <div className="text-center space-y-3">
                    {draft.style === 'minimalista' && (
                      <div
                        className="w-16 h-1 mx-auto mb-3"
                        style={{ backgroundColor: draft.accentColor }}
                      />
                    )}
                    {draft.headerText && (
                      <div className="text-[9.5px] uppercase tracking-[0.14em] text-slate-500">
                        {draft.headerText}
                      </div>
                    )}

                    <div className="pt-2 flex justify-center">
                      <ProfileLogoMark
                        profile={profile}
                        primaryColor={draft.primaryColor}
                        accentColor={draft.accentColor}
                        size={logoSizePx}
                      />
                    </div>

                    {draft.fields.institucion && (
                      <div
                        className="text-[15.5px] font-bold leading-snug pt-1"
                        style={{ color: draft.primaryColor }}
                      >
                        {profile.institution}
                      </div>
                    )}
                    {draft.fields.carrera && (
                      <div className="text-[12px] text-slate-600">{profile.faculty}</div>
                    )}
                  </div>

                  {/* Center Subject & Title */}
                  <div className="text-center space-y-2.5 my-4 px-2">
                    {draft.fields.asignatura && (
                      <div
                        className="text-[12.5px] font-semibold tracking-wide"
                        style={{ color: draft.accentColor }}
                      >
                        {profile.previewSubject}
                      </div>
                    )}
                    {draft.fields.titulo && (
                      <h3 className="text-[20px] font-bold leading-tight text-slate-900 text-balance">
                        {profile.previewTitle}
                      </h3>
                    )}
                  </div>

                  {/* Bottom Metadata & Footer */}
                  <div className="space-y-4">
                    <div className="border-t border-slate-200 pt-3 space-y-1.5 text-[11.5px]">
                      {draft.fields.sustentante && (
                        <div className="flex justify-between gap-4">
                          <span className="font-semibold text-slate-600">Sustentante:</span>
                          <span className="text-slate-900 text-right">{profile.fullName}</span>
                        </div>
                      )}
                      {draft.fields.matricula && (
                        <div className="flex justify-between gap-4">
                          <span className="font-semibold text-slate-600">Matrícula:</span>
                          <span className="font-mono text-slate-900">{profile.matricula}</span>
                        </div>
                      )}
                      {draft.fields.docente && (
                        <div className="flex justify-between gap-4">
                          <span className="font-semibold text-slate-600">Docente:</span>
                          <span className="text-slate-900 text-right">{profile.previewProfessor}</span>
                        </div>
                      )}
                      {draft.fields.seccion && (
                        <div className="flex justify-between gap-4">
                          <span className="font-semibold text-slate-600">Sección / Código:</span>
                          <span className="text-slate-900">{profile.previewSection}</span>
                        </div>
                      )}
                      {draft.fields.fecha && (
                        <div className="flex justify-between gap-4">
                          <span className="font-semibold text-slate-600">Fecha de entrega:</span>
                          <span className="text-slate-900">{todayLabel}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-center text-[10px] text-slate-500 pt-1">
                      {[draft.footerText, draft.fields.paginaUno ? 'Página 1' : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                </div>

                {draft.style === 'clasica' && (
                  <div
                    className="h-1.5 mx-12 mb-6"
                    style={{ backgroundColor: draft.accentColor }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
