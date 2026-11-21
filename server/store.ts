import fs from 'node:fs';
import path from 'node:path';
import type {
  ActivityEvent,
  CoverConfig,
  CredentialsStatus,
  StudentProfile,
  SystemSettings,
  TaskItem,
  WeeklySchedule,
} from '../src/types/botchase.ts';

export interface StoredSecrets {
  telegramBotToken: string;
  telegramChatId: string;
  moodleUser: string;
  moodlePass: string;
}

export interface PersistedState {
  profile: StudentProfile;
  coverConfig: CoverConfig;
  settings: SystemSettings;
  weeklySchedule: WeeklySchedule;
  tasks: TaskItem[];
  recentActivity: ActivityEvent[];
  itlaConnected: boolean;
  itlaSessionUser: string;
  lastRunAt: string | null;
  lastError: string | null;
  watching: boolean;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STATE_PATH = path.join(DATA_DIR, 'botchase_state.json');
const SECRETS_PATH = path.join(DATA_DIR, 'botchase_secrets.json');
export const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), 'Tareas pendientes');

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function maskSecret(val: string | undefined, keepChars = 4): string {
  if (!val || !val.trim()) return 'Pendiente';
  const clean = val.trim();
  if (clean.length <= keepChars) {
    return `Configurada · ${'•'.repeat(clean.length)}`;
  }
  return `Configurada · ••••${clean.slice(-keepChars)}`;
}

function getDefaultState(): PersistedState {
  const now = Date.now();
  const iso = (daysOffset: number) => new Date(now + daysOffset * 86400000).toISOString();

  return {
    profile: {
      fullName: 'Carlos Manuel Peña Rodríguez',
      matricula: '2024-1842',
      email: '20241842@itla.edu.do',
      institution: 'Instituto Tecnológico de Las Américas (ITLA)',
      faculty: 'Tecnólogo en Desarrollo de Software',
      campus: 'La Caleta, Boca Chica · Santo Domingo',
      logoType: 'emblem',
      emblemVariant: 'escudo',
      logoDataUrl: '',
      previewSubject: 'Ingeniería de Software I',
      previewProfessor: 'Ing. Roberto Alcántara',
      previewTitle: 'Arquitectura Orientada a Eventos y Colas Asíncronas',
      previewSection: 'TDS-301 · Sec. 02',
    },
    coverConfig: {
      style: 'clasica',
      primaryColor: '#1E3A8A',
      accentColor: '#6B93F5',
      fontFamily: 'serif',
      logoSize: 'medium',
      headerText: 'República Dominicana · Educación Superior Tecnológica',
      footerText: 'Documento generado para revisión académica · ITLAVIRTUAL',
      fields: {
        institucion: true,
        carrera: true,
        asignatura: true,
        titulo: true,
        sustentante: true,
        matricula: true,
        docente: true,
        seccion: true,
        fecha: true,
        indiceTematico: true,
        paginaUno: false,
      },
    },
    settings: {
      outputDir: DEFAULT_OUTPUT_DIR,
      defaultIntervalMinutes: 30,
      geminiThreads: 2,
      useSystemEdge: true,
      minimizeToTray: true,
      watchOnLaunch: false,
      headlessBrowser: false,
    },
    weeklySchedule: {
      L: true,
      M: true,
      X: true,
      J: true,
      V: true,
      S: true,
      D: false,
    },
    tasks: [
      {
        cmid: '48219',
        title: 'Ensayo comparativo: Arquitecturas Monolíticas vs. Microservicios',
        subject: 'Ingeniería de Software I',
        sectionCode: 'TDS-301 · Sec. 02',
        professor: 'Ing. Roberto Alcántara',
        dueDate: iso(1),
        dueLabel: 'Mañana · 23:59',
        url: 'https://aulavirtual.itla.edu.do/mod/assign/view.php?id=48219',
        submissionStatus: 'Sin entrega',
        classification: 'PDF',
        status: 'PDF listo',
        reason: 'Actividad de análisis teórico redactable en formato académico PDF y DOCX.',
        description:
          'Redactar un ensayo técnico de 4 secciones comparando escalabilidad, despliegue, observabilidad y latencia entre arquitecturas monolíticas modulares y microservicios.',
        pdfFile: '48219_Ensayo_Monoliticos_vs_Microservicios.pdf',
        docxFile: '48219_Ensayo_Monoliticos_vs_Microservicios.docx',
        outputDir: DEFAULT_OUTPUT_DIR,
        updatedAt: new Date(now - 3600000).toISOString(),
      },
      {
        cmid: '48234',
        title: 'Práctica de Laboratorio: Capturas de topología VLAN en Packet Tracer',
        subject: 'Fundamentos de Redes y Conmutación',
        sectionCode: 'RED-204 · Sec. 01',
        professor: 'Ing. Laura Méndez',
        dueDate: iso(2),
        dueLabel: 'En 2 días · 23:59',
        url: 'https://aulavirtual.itla.edu.do/mod/assign/view.php?id=48234',
        submissionStatus: 'Sin entrega',
        classification: 'Manual',
        status: 'Aviso manual',
        reason: 'Requiere capturas de pantalla y archivo .pkt de Cisco Packet Tracer. Aviso enviado a Telegram.',
        description:
          'Configurar 3 VLANs con enlace troncal 802.1Q, adjuntar capturas de ping exitoso y subir el archivo .pkt.',
        updatedAt: new Date(now - 7200000).toISOString(),
      },
      {
        cmid: '48245',
        title: 'Investigación sobre Normalización hasta Forma Normal de Boyce-Codd',
        subject: 'Base de Datos Avanzadas',
        sectionCode: 'BDD-210 · Sec. 03',
        professor: 'Lic. Marcos Taveras',
        dueDate: iso(3),
        dueLabel: 'En 3 días · 20:00',
        url: 'https://aulavirtual.itla.edu.do/mod/assign/view.php?id=48245',
        submissionStatus: 'Sin entrega',
        classification: 'PDF',
        status: 'Pendiente',
        reason: 'Actividad de investigación teórica con ejemplos SQL; lista para redactar con Gemini.',
        description:
          'Explicar 1FN, 2FN, 3FN y BCNF con casos de anomalías de inserción, actualización y borrado en PostgreSQL.',
        updatedAt: new Date(now - 10800000).toISOString(),
      },
      {
        cmid: '48251',
        title: 'Informe técnico: Seguridad en APIs REST con JWT y OAuth 2.1',
        subject: 'Desarrollo Web Backend',
        sectionCode: 'WEB-305 · Sec. 01',
        professor: 'Ing. Patricia Núñez',
        dueDate: iso(5),
        dueLabel: 'En 5 días · 23:59',
        url: 'https://aulavirtual.itla.edu.do/mod/assign/view.php?id=48251',
        submissionStatus: 'Sin entrega',
        classification: 'PDF',
        status: 'Error',
        reason: 'Fallo previo al redactar por límite temporal de conexión; disponible para reintento.',
        description:
          'Analizar flujo PKCE, rotación de refresh tokens, mitigación de CSRF y buenas prácticas de almacenamiento.',
        errorMessage: 'Tiempo de espera agotado en la compilación previa; listo para reintentar.',
        updatedAt: new Date(now - 14400000).toISOString(),
      },
      {
        cmid: '48190',
        title: 'Control de lectura: Ciclo de vida ágil y Scrum en equipos remotos',
        subject: 'Gestión de Proyectos TI',
        sectionCode: 'GPT-112 · Sec. 04',
        professor: 'Lic. Sofía Batista',
        dueDate: iso(6),
        dueLabel: 'En 6 días · 18:00',
        url: 'https://aulavirtual.itla.edu.do/mod/assign/view.php?id=48190',
        submissionStatus: 'Enviado para calificar',
        classification: 'Omitida',
        status: 'Omitida',
        reason: 'Estado Moodle: "Enviado para calificar". Omitida automáticamente según regla.',
        description: 'Resumen ejecutivo sobre artefactos de Scrum y retrospectivas.',
        updatedAt: new Date(now - 28800000).toISOString(),
      },
    ],
    recentActivity: [
      {
        id: 'act-1',
        timestamp: new Date(now - 3600000).toISOString(),
        title: 'PDF y DOCX compilados (#48219)',
        detail: 'Ensayo comparativo guardado en Tareas pendientes/',
        kind: 'pdf',
        cmid: '48219',
      },
      {
        id: 'act-2',
        timestamp: new Date(now - 7200000).toISOString(),
        title: 'Aviso manual clasificado (#48234)',
        detail: 'Requiere capturas de Packet Tracer (.pkt)',
        kind: 'manual',
        cmid: '48234',
      },
      {
        id: 'act-3',
        timestamp: new Date(now - 14400000).toISOString(),
        title: 'Tarea #48251 requiere reintento',
        detail: 'Disponible para reprocesar con Gemini y compilar portada',
        kind: 'error',
        cmid: '48251',
      },
    ],
    itlaConnected: true,
    itlaSessionUser: '20241842@itla.edu.do',
    lastRunAt: new Date(now - 3600000).toISOString(),
    lastError: null,
    watching: false,
  };
}

class StateStore {
  private state: PersistedState;
  private secrets: StoredSecrets;

  constructor() {
    ensureDir(DATA_DIR);
    this.state = this.loadState();
    this.secrets = this.loadSecrets();
    ensureDir(this.state.settings.outputDir || DEFAULT_OUTPUT_DIR);
  }

  private loadState(): PersistedState {
    try {
      if (fs.existsSync(STATE_PATH)) {
        const raw = fs.readFileSync(STATE_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        const def = getDefaultState();
        return {
          ...def,
          ...parsed,
          profile: { ...def.profile, ...(parsed.profile || {}) },
          coverConfig: {
            ...def.coverConfig,
            ...(parsed.coverConfig || {}),
            fields: { ...def.coverConfig.fields, ...(parsed.coverConfig?.fields || {}) },
          },
          settings: { ...def.settings, ...(parsed.settings || {}) },
          weeklySchedule: { ...def.weeklySchedule, ...(parsed.weeklySchedule || {}) },
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks : def.tasks,
          recentActivity: Array.isArray(parsed.recentActivity) ? parsed.recentActivity : def.recentActivity,
        };
      }
    } catch {
      // Fallback to defaults if corrupted
    }
    const def = getDefaultState();
    this.writeStateFile(def);
    return def;
  }

  private loadSecrets(): StoredSecrets {
    try {
      if (fs.existsSync(SECRETS_PATH)) {
        const raw = fs.readFileSync(SECRETS_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<StoredSecrets>;
        return {
          telegramBotToken: parsed.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '',
          telegramChatId: parsed.telegramChatId || process.env.TELEGRAM_CHAT_ID || '',
          moodleUser: parsed.moodleUser || process.env.MOODLE_USER || '',
          moodlePass: parsed.moodlePass || process.env.MOODLE_PASS || '',
        };
      }
    } catch {
      // ignore
    }
    return {
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
      telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
      moodleUser: process.env.MOODLE_USER || '',
      moodlePass: process.env.MOODLE_PASS || '',
    };
  }

  private writeStateFile(data: PersistedState): void {
    ensureDir(DATA_DIR);
    fs.writeFileSync(STATE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  }

  private writeSecretsFile(data: StoredSecrets): void {
    ensureDir(DATA_DIR);
    fs.writeFileSync(SECRETS_PATH, JSON.stringify(data, null, 2), 'utf-8');
  }

  public getState(): PersistedState {
    return this.state;
  }

  public saveState(updater: (current: PersistedState) => PersistedState): PersistedState {
    this.state = updater(this.state);
    ensureDir(this.state.settings.outputDir || DEFAULT_OUTPUT_DIR);
    this.writeStateFile(this.state);
    return this.state;
  }

  public getSecrets(): StoredSecrets {
    return this.secrets;
  }

  public updateSecrets(partial: Partial<StoredSecrets>): CredentialsStatus {
    const next: StoredSecrets = { ...this.secrets };
    if (typeof partial.telegramBotToken === 'string' && partial.telegramBotToken.trim()) {
      next.telegramBotToken = partial.telegramBotToken.trim();
    }
    if (typeof partial.telegramChatId === 'string' && partial.telegramChatId.trim()) {
      next.telegramChatId = partial.telegramChatId.trim();
    }
    if (typeof partial.moodleUser === 'string' && partial.moodleUser.trim()) {
      next.moodleUser = partial.moodleUser.trim();
    }
    if (typeof partial.moodlePass === 'string' && partial.moodlePass.trim()) {
      next.moodlePass = partial.moodlePass.trim();
    }
    this.secrets = next;
    this.writeSecretsFile(next);
    return this.getCredentialsStatus();
  }

  public clearSecret(field: keyof StoredSecrets): CredentialsStatus {
    this.secrets = { ...this.secrets, [field]: '' };
    this.writeSecretsFile(this.secrets);
    return this.getCredentialsStatus();
  }

  public getCredentialsStatus(): CredentialsStatus {
    const geminiKey = process.env.GEMINI_API_KEY || '';
    return {
      geminiConfigured: Boolean(geminiKey.trim()),
      geminiHint: geminiKey.trim()
        ? `Configurada en entorno · ••••${geminiKey.trim().slice(-4)}`
        : 'Pendiente en Secrets',
      telegramTokenConfigured: Boolean(this.secrets.telegramBotToken.trim()),
      telegramTokenHint: maskSecret(this.secrets.telegramBotToken),
      telegramChatConfigured: Boolean(this.secrets.telegramChatId.trim()),
      telegramChatHint: maskSecret(this.secrets.telegramChatId),
      moodleUserConfigured: Boolean(this.secrets.moodleUser.trim()),
      moodleUserHint: this.secrets.moodleUser.trim()
        ? `Configurada · ${this.secrets.moodleUser.trim()}`
        : 'Pendiente',
      moodlePassConfigured: Boolean(this.secrets.moodlePass.trim()),
      moodlePassHint: maskSecret(this.secrets.moodlePass, 2),
    };
  }

  public addActivity(event: Omit<ActivityEvent, 'id' | 'timestamp'>): void {
    const newItem: ActivityEvent = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...event,
    };
    this.saveState((s) => ({
      ...s,
      recentActivity: [newItem, ...s.recentActivity].slice(0, 25),
    }));
  }
}

export const stateStore = new StateStore();
