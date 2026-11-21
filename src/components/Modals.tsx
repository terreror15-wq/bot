import React, { useEffect, useState } from 'react';
import {
  ArrowUp,
  Download,
  ExternalLink,
  FileText,
  Folder,
  FolderPlus,
  Globe,
  Maximize2,
  Pause,
  Play,
  RefreshCw,
  X,
} from 'lucide-react';
import type {
  BotState,
  DirectoryListing,
  OutputFileEntry,
  TaskItem,
} from '../types/botchase';

/* 1. System Tray Minimized Overlay */
export const SystemTrayDock: React.FC<{
  botState: BotState;
  onRestore: () => void;
  onRunNow: () => void;
  onToggleWatch: () => void;
}> = ({ botState, onRestore, onRunNow, onToggleWatch }) => {
  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#171B26] border border-[#252B3B] rounded-xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#6B93F5]/15 border border-[#6B93F5]/35 flex items-center justify-center text-[#6B93F5] font-bold text-sm">
              BC
            </div>
            <div>
              <div className="text-[15px] font-semibold text-[#F4F6FB]">BotChase en bandeja</div>
              <div className="text-[12px] text-[#8E98B0]">{botState.currentStep}</div>
            </div>
          </div>
          <span className="text-[11.5px] font-mono tabular-nums text-[#6B93F5]">
            {botState.watching ? `Activa (${botState.intervalMinutes}m)` : 'En pausa'}
          </span>
        </div>

        <div className="border-t border-[#252B3B] pt-4 space-y-2">
          <button
            type="button"
            onClick={onRestore}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-[#6B93F5] hover:bg-[#5A82E6] text-[#0B101B] text-[13.5px] font-medium cursor-pointer"
          >
            <span>Abrir BotChase</span>
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onRunNow}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-[#12151E] hover:bg-[#1D2230] border border-[#252B3B] text-[#E6EAF2] text-[13px] font-medium cursor-pointer"
          >
            <span>Revisar calendario ahora</span>
            <RefreshCw className="w-4 h-4 text-[#6B93F5]" />
          </button>

          <button
            type="button"
            onClick={onToggleWatch}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-[#12151E] hover:bg-[#1D2230] border border-[#252B3B] text-[#E6EAF2] text-[13px] font-medium cursor-pointer"
          >
            <span>{botState.watching ? 'Pausar vigilancia' : 'Activar vigilancia'}</span>
            {botState.watching ? (
              <Pause className="w-4 h-4 text-[#FBBF24]" />
            ) : (
              <Play className="w-4 h-4 text-[#34D399]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* 2. Connect ITLA SSO Modal */
export const ConnectItlaModal: React.FC<{
  initialEmail: string;
  useEdge: boolean;
  onClose: () => void;
  onConnect: (email: string) => void;
}> = ({ initialEmail, useEdge, onClose, onConnect }) => {
  const [email, setEmail] = useState(initialEmail);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect(email);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#171B26] border border-[#252B3B] rounded-xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-[#252B3B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#6B93F5]" />
            <h3 className="text-[15px] font-semibold text-[#F4F6FB]">Conectar ITLAVIRTUAL (SSO)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#8E98B0] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-[13px] text-[#9BA5BC] leading-relaxed">
            Inicia el perfil de {useEdge ? 'Microsoft Edge' : 'Chromium'} hacia{' '}
            <span className="font-mono text-[#D8E0F2]">aulavirtual.itla.edu.do</span> para
            capturar y guardar el estado de sesión en <span className="font-mono">session.json</span>.
          </p>

          <label className="block space-y-1.5">
            <span className="text-[12.5px] text-[#8E98B0] block">Cuenta institucional ITLA</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="matricula@itla.edu.do"
              className="w-full rounded-lg bg-[#12151E] border border-[#252B3B] px-3.5 py-2 text-[13.5px] text-[#E6EAF2] focus:outline-none focus:border-[#6B93F5]"
            />
          </label>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[13px] font-medium bg-[#12151E] border border-[#252B3B] text-[#9BA5BC] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-[13px] font-medium bg-[#6B93F5] hover:bg-[#5A82E6] text-[#0B101B] cursor-pointer"
            >
              Abrir navegador SSO
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* 3. Folder Picker Modal ("Elegir carpeta...") */
export const FolderPickerModal: React.FC<{
  initialPath: string;
  onClose: () => void;
  onSelectPath: (selectedPath: string) => void;
}> = ({ initialPath, onClose, onSelectPath }) => {
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadDir = async (targetPath?: string) => {
    setError(null);
    const url = targetPath
      ? `/api/fs/browse?path=${encodeURIComponent(targetPath)}`
      : '/api/fs/browse';
    const res = await fetch(url);
    if (!res.ok) {
      setError('No se pudo leer el directorio solicitado.');
      return;
    }
    const data = (await res.json()) as DirectoryListing;
    setListing(data);
  };

  useEffect(() => {
    void loadDir(initialPath);
  }, [initialPath]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !listing) return;
    const res = await fetch('/api/fs/mkdir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentPath: listing.currentPath,
        folderName: newFolderName.trim(),
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.error || 'Error creando carpeta');
      return;
    }
    setNewFolderName('');
    await loadDir(listing.currentPath);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#171B26] border border-[#252B3B] rounded-xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-[#252B3B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-[#6B93F5]" />
            <h3 className="text-[15px] font-semibold text-[#F4F6FB]">Elegir carpeta de salida</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#8E98B0] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!listing?.parentPath}
              onClick={() => listing?.parentPath && void loadDir(listing.parentPath)}
              className="p-2 rounded-lg bg-[#12151E] border border-[#252B3B] text-[#C8D4F0] disabled:opacity-40 cursor-pointer"
              title="Subir un nivel"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <div className="flex-1 rounded-lg bg-[#12151E] border border-[#252B3B] px-3 py-2 text-[12.5px] font-mono text-[#D8E0F2] truncate">
              {listing?.currentPath || 'Cargando...'}
            </div>
          </div>

          <div className="h-56 overflow-y-auto rounded-lg bg-[#12151E] border border-[#252B3B] divide-y divide-[#1E2331]">
            {listing?.directories.length === 0 ? (
              <div className="p-6 text-center text-[12.5px] text-[#7D879E]">
                Sin subcarpetas en esta ruta.
              </div>
            ) : (
              listing?.directories.map((dir) => (
                <button
                  key={dir.path}
                  type="button"
                  onClick={() => void loadDir(dir.path)}
                  className="w-full px-3.5 py-2.5 flex items-center gap-2.5 text-left text-[13px] text-[#D8E0F2] hover:bg-[#1A202E] cursor-pointer"
                >
                  <Folder className="w-4 h-4 text-[#6B93F5] shrink-0" />
                  <span className="truncate">{dir.name}</span>
                </button>
              ))
            )}
          </div>

          <form onSubmit={handleCreateFolder} className="flex items-center gap-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nueva subcarpeta..."
              className="flex-1 rounded-lg bg-[#12151E] border border-[#252B3B] px-3 py-2 text-[13px] text-[#E6EAF2] placeholder:text-[#5B647A] focus:outline-none focus:border-[#6B93F5]"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1D2230] border border-[#2D3548] text-[12.5px] text-[#E6EAF2] cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-[#6B93F5]" />
              <span>Crear</span>
            </button>
          </form>

          {error && <div className="text-[12px] text-[#F87171]">{error}</div>}

          <div className="flex justify-end gap-2.5 pt-2 border-t border-[#252B3B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[13px] bg-[#12151E] border border-[#252B3B] text-[#9BA5BC] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!listing}
              onClick={() => {
                if (listing) {
                  onSelectPath(listing.currentPath);
                  onClose();
                }
              }}
              className="px-4 py-2 rounded-lg text-[13px] font-medium bg-[#6B93F5] hover:bg-[#5A82E6] text-[#0B101B] cursor-pointer"
            >
              Usar esta carpeta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* 4. Output Folder Explorer Modal ("Abrir carpeta PDFs") */
export const OutputExplorerModal: React.FC<{
  onClose: () => void;
  onPreviewFile: (fileName: string, dir: string) => void;
}> = ({ onClose, onPreviewFile }) => {
  const [outputDir, setOutputDir] = useState('');
  const [files, setFiles] = useState<OutputFileEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/files/output');
        const data = await res.json();
        setOutputDir(data.outputDir || '');
        setFiles(data.files || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#171B26] border border-[#252B3B] rounded-xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-[#252B3B] flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-[#F4F6FB]">
              Explorador de archivos generados
            </h3>
            <div className="text-[12px] font-mono text-[#7D879E] truncate">{outputDir}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#8E98B0] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="py-10 text-center text-[13px] text-[#8E98B0]">Leyendo carpeta...</div>
          ) : files.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-[#8E98B0]">
              La carpeta configurada aún no contiene archivos PDF o DOCX.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-[#252B3B] border border-[#252B3B] rounded-lg bg-[#12151E]">
              {files.map((file) => (
                <div
                  key={file.path}
                  className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-[#191E2B]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText
                      className={`w-4 h-4 shrink-0 ${
                        file.ext === '.pdf' ? 'text-[#34D399]' : 'text-[#6B93F5]'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-[#E6EAF2] truncate">
                        {file.name}
                      </div>
                      <div className="text-[11.5px] font-mono tabular-nums text-[#7D879E]">
                        {(file.size / 1024).toFixed(1)} KB ·{' '}
                        {new Date(file.modifiedAt).toLocaleString('es-DO')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {file.ext === '.pdf' && (
                      <button
                        type="button"
                        onClick={() => onPreviewFile(file.name, outputDir)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium bg-[#6B93F5] text-[#0B101B] cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ver</span>
                      </button>
                    )}
                    <a
                      href={`/api/files/view?name=${encodeURIComponent(file.name)}&dir=${encodeURIComponent(
                        outputDir
                      )}&download=1`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium bg-[#1D2230] border border-[#2D3548] text-[#E6EAF2]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* 5. PDF Viewer Modal ("Abrir PDF") */
export const PdfPreviewModal: React.FC<{
  title: string;
  pdfFile: string;
  docxFile?: string;
  outputDir?: string;
  onClose: () => void;
}> = ({ title, pdfFile, docxFile, outputDir, onClose }) => {
  const dirQuery = outputDir ? `&dir=${encodeURIComponent(outputDir)}` : '';
  const viewUrl = `/api/files/view?name=${encodeURIComponent(pdfFile)}${dirQuery}`;
  const downloadPdfUrl = `${viewUrl}&download=1`;
  const downloadDocxUrl = docxFile
    ? `/api/files/view?name=${encodeURIComponent(docxFile)}${dirQuery}&download=1`
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[86vh] bg-[#171B26] border border-[#252B3B] rounded-xl overflow-hidden flex flex-col shadow-2xl">
        <div className="px-5 py-3.5 border-b border-[#252B3B] flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[14.5px] font-semibold text-[#F4F6FB] truncate">{title}</h3>
            <div className="text-[12px] font-mono text-[#7D879E] truncate">{pdfFile}</div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={downloadPdfUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium bg-[#6B93F5] text-[#0B101B]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </a>
            {downloadDocxUrl && (
              <a
                href={downloadDocxUrl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium bg-[#1D2230] border border-[#2D3548] text-[#E6EAF2]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>DOCX</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8E98B0] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-[#0E1117]">
          <iframe title={title} src={viewUrl} className="w-full h-full border-0" />
        </div>
      </div>
    </div>
  );
};
