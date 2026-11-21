import React, { useRef, useState } from 'react';
import { Check, RotateCcw, Save, Upload } from 'lucide-react';
import type { EmblemVariant, StudentProfile } from '../types/botchase';
import { EmblemSvg, getProfileInitials } from './EmblemSvg';

interface ProfileViewProps {
  profile: StudentProfile;
  primaryColor: string;
  onSaveProfile: (next: StudentProfile) => Promise<void>;
}

const EMBLEMS: Array<{ id: EmblemVariant; label: string }> = [
  { id: 'escudo', label: 'Escudo' },
  { id: 'sello', label: 'Sello' },
  { id: 'iniciales', label: 'Iniciales' },
];

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  primaryColor,
  onSaveProfile,
}) => {
  const [draft, setDraft] = useState<StudentProfile>(profile);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('El archivo supera el límite máximo de 2 MB.');
      return;
    }

    const validTypes = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Formato no permitido. Usa PNG, SVG, JPG o WEBP.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) {
        setDraft((p) => ({
          ...p,
          logoType: 'upload',
          logoDataUrl: result,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    setUploadError(null);
    setDraft((p) => ({
      ...p,
      logoType: 'emblem',
      emblemVariant: 'escudo',
      logoDataUrl: '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveProfile(draft);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[#F4F6FB]">Perfil del estudiante y logo</h1>
          <p className="text-[13.5px] text-[#8E98B0]">
            Información académica reflejada en las portadas generadas y la vista previa.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13.5px] font-medium bg-[#6B93F5] hover:bg-[#5A82E6] text-[#0B101B] disabled:opacity-60 cursor-pointer whitespace-nowrap"
        >
          {savedNotice ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{savedNotice ? 'Cambios guardados' : saving ? 'Guardando...' : 'Guardar cambios'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Student Data */}
        <section className="xl:col-span-7 bg-[#171B26] border border-[#252B3B] rounded-xl p-6 space-y-4">
          <h2 className="text-[15px] font-semibold text-[#F3F5FA]">Datos institucionales</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-[12.5px] text-[#8E98B0] block">Nombre completo</span>
              <input
                type="text"
                value={draft.fullName}
                onChange={(e) => setDraft((p) => ({ ...p, fullName: e.target.value }))}
                className="w-full rounded-lg bg-[#12151E] border border-[#252B3B] px-3.5 py-2 text-[13.5px] text-[#E6EAF2] focus:outline-none focus:border-[#6B93F5]"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[12.5px] text-[#8E98B0] block">Matrícula</span>
              <input
                type="text"
                value={draft.matricula}
                onChange={(e) => setDraft((p) => ({ ...p, matricula: e.target.value }))}
                className="w-full rounded-lg bg-[#12151E] border border-[#252B3B] px-3.5 py-2 text-[13.5px] font-mono text-[#E6EAF2] focus:outline-none focus:border-[#6B93F5]"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[12.5px] text-[#8E98B0] block">Correo institucional</span>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
                className="w-full rounded-lg bg-[#12151E] border border-[#252B3B] px-3.5 py-2 text-[13.5px] text-[#E6EAF2] focus:outline-none focus:border-[#6B93F5]"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[12.5px] text-[#8E98B0] block">Institución educativa</span>
              <input
                type="text"
                value={draft.institution}
                onChange={(e) => setDraft((p) => ({ ...p, institution: e.target.value }))}
                className="w-full rounded-lg bg-[#12151E] border border-[#252B3B] px-3.5 py-2 text-[13.5px] text-[#E6EAF2] focus:outline-none focus:border-[#6B93F5]"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[12.5px] text-[#8E98B0] block">Carrera o Facultad</span>
              <input
                type="text"
                value={draft.faculty}
                onChange={(e) => setDraft((p) => ({ ...p, faculty: e.target.value }))}
                className="w-full rounded-lg bg-[#12151E] border border-[#252B3B] px-3.5 py-2 text-[13.5px] text-[#E6EAF2] focus:outline-none focus:border-[#6B93F5]"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[12.5px] text-[#8E98B0] block">Recinto / Ciudad</span>
              <input
                type="text"
                value={draft.campus}
                onChange={(e) => setDraft((p) => ({ ...p, campus: e.target.value }))}
                className="w-full rounded-lg bg-[#12151E] border border-[#252B3B] px-3.5 py-2 text-[13.5px] text-[#E6EAF2] focus:outline-none focus:border-[#6B93F5]"
              />
            </label>
          </div>

          <div className="pt-4 border-t border-[#252B3B] space-y-3">
            <h3 className="text-[14px] font-semibold text-[#F3F5FA]">
              Campos de prueba para vista previa de portada
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-1.5">
                <span className="text-[12.5px] text-[#8E98B0] block">Asignatura de prueba</span>
                <input
                  type="text"
                  value={draft.previewSubject}
                  onChange={(e) => setDraft((p) => ({ ...p, previewSubject: e.target.value }))}
                  className="w-full rounded-lg bg-[#12151E] border border-[#252B3B] px-3.5 py-2 text-[13.5px] text-[#E6EAF2] focus:outline-none focus:border-[#6B93F5]"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-[12.5px] text-[#8E98B0] block">Docente de prueba</span>
                <input
                  type="text"
                  value={draft.previewProfessor}
                  onChange={(e) => setDraft((p) => ({ ...p, previewProfessor: e.target.value }))}
                  className="w-full rounded-lg bg-[#12151E] border border-[#252B3B] px-3.5 py-2 text-[13.5px] text-[#E6EAF2] focus:outline-none focus:border-[#6B93F5]"
                />
              </label>

              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[12.5px] text-[#8E98B0] block">Título de práctica</span>
                <input
                  type="text"
                  value={draft.previewTitle}
                  onChange={(e) => setDraft((p) => ({ ...p, previewTitle: e.target.value }))}
                  className="w-full rounded-lg bg-[#12151E] border border-[#252B3B] px-3.5 py-2 text-[13.5px] text-[#E6EAF2] focus:outline-none focus:border-[#6B93F5]"
                />
              </label>
            </div>
          </div>
        </section>

        {/* Logo & Emblems */}
        <section className="xl:col-span-5 bg-[#171B26] border border-[#252B3B] rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-[#F3F5FA]">Logo o emblema</h2>
            <button
              type="button"
              onClick={handleResetLogo}
              className="inline-flex items-center gap-1.5 text-[12.5px] text-[#8E98B0] hover:text-[#E6EAF2] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer</span>
            </button>
          </div>

          <div className="p-6 rounded-xl bg-[#12151E] border border-[#252B3B] flex flex-col items-center justify-center gap-3">
            {draft.logoType === 'upload' && draft.logoDataUrl ? (
              <img
                src={draft.logoDataUrl}
                alt="Logo cargado"
                className="w-24 h-24 object-contain"
              />
            ) : (
              <EmblemSvg
                variant={draft.emblemVariant}
                color="#6B93F5"
                accentColor={primaryColor}
                size={88}
                initials={getProfileInitials(draft.fullName)}
              />
            )}
            <div className="text-[12px] text-[#8E98B0]">
              {draft.logoType === 'upload'
                ? 'Imagen personalizada cargada'
                : `Emblema activo: ${draft.emblemVariant}`}
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="text-[12.5px] text-[#8E98B0]">Elegir emblema generado</div>
            <div className="grid grid-cols-3 gap-2.5">
              {EMBLEMS.map((emb) => {
                const active =
                  draft.logoType === 'emblem' && draft.emblemVariant === emb.id;
                return (
                  <button
                    key={emb.id}
                    type="button"
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        logoType: 'emblem',
                        emblemVariant: emb.id,
                      }))
                    }
                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                      active
                        ? 'bg-[#6B93F5]/16 border-[#6B93F5]/50 text-[#F3F5FA]'
                        : 'bg-[#12151E] border-[#252B3B] text-[#8E98B0] hover:text-[#E6EAF2]'
                    }`}
                  >
                    <EmblemSvg
                      variant={emb.id}
                      color={active ? '#6B93F5' : '#8E98B0'}
                      accentColor="#4E68A8"
                      size={40}
                      initials={getProfileInitials(draft.fullName)}
                    />
                    <span className="text-[12px] font-medium">{emb.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept=".png,.svg,.jpg,.jpeg,.webp,image/png,image/svg+xml,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#12151E] hover:bg-[#1D2230] border border-[#252B3B] text-[13px] font-medium text-[#E6EAF2] cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#6B93F5]" />
              <span>Subir imagen local (PNG, SVG, JPG, WEBP · máx. 2 MB)</span>
            </button>
            {uploadError && <div className="text-[12px] text-[#F87171]">{uploadError}</div>}
          </div>
        </section>
      </div>
    </form>
  );
};
