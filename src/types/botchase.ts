export type NavSection =
  | 'inicio'
  | 'calendario'
  | 'tareas'
  | 'portada'
  | 'ajustes'
  | 'perfil';

export type BotStatus = 'idle' | 'watching' | 'working' | 'error';

export type TaskClassification = 'PDF' | 'Manual' | 'Omitida';

export type TaskStatus =
  | 'PDF listo'
  | 'Aviso manual'
  | 'Error'
  | 'Omitida'
  | 'Procesando'
  | 'Pendiente';

export interface TaskItem {
  cmid: string;
  title: string;
  subject: string;
  sectionCode?: string;
  professor?: string;
  dueDate: string; // ISO date string or human-readable ISO
  dueLabel: string;
  url: string;
  submissionStatus: string;
  classification: TaskClassification;
  status: TaskStatus;
  reason: string;
  description: string;
  pdfFile?: string;
  docxFile?: string;
  htmlFile?: string;
  outputDir?: string;
  updatedAt: string;
  errorMessage?: string;
}

export type LogLevel = 'INFO' | 'WARNING' | 'ERROR';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  kind: 'pdf' | 'manual' | 'sync' | 'error' | 'template';
  cmid?: string;
}

export type CoverStyle = 'clasica' | 'minimalista' | 'ejecutiva' | 'editorial';
export type CoverFont = 'sans' | 'serif';
export type LogoSize = 'small' | 'medium' | 'large';

export interface CoverVisibleFields {
  institucion: boolean;
  carrera: boolean;
  asignatura: boolean;
  titulo: boolean;
  sustentante: boolean;
  matricula: boolean;
  docente: boolean;
  seccion: boolean;
  fecha: boolean;
  indiceTematico: boolean;
  paginaUno: boolean;
}

export interface CoverConfig {
  style: CoverStyle;
  primaryColor: string;
  accentColor: string;
  fontFamily: CoverFont;
  logoSize: LogoSize;
  headerText: string;
  footerText: string;
  fields: CoverVisibleFields;
}

export type EmblemVariant = 'escudo' | 'sello' | 'iniciales';

export interface StudentProfile {
  fullName: string;
  matricula: string;
  email: string;
  institution: string;
  faculty: string;
  campus: string;
  logoType: 'emblem' | 'upload';
  emblemVariant: EmblemVariant;
  logoDataUrl: string;
  previewSubject: string;
  previewProfessor: string;
  previewTitle: string;
  previewSection: string;
}

export interface SystemSettings {
  outputDir: string;
  defaultIntervalMinutes: number;
  geminiThreads: number;
  useSystemEdge: boolean;
  minimizeToTray: boolean;
  watchOnLaunch: boolean;
  headlessBrowser: boolean;
}

export interface CredentialsStatus {
  geminiConfigured: boolean;
  geminiHint: string;
  telegramTokenConfigured: boolean;
  telegramTokenHint: string;
  telegramChatConfigured: boolean;
  telegramChatHint: string;
  moodleUserConfigured: boolean;
  moodleUserHint: string;
  moodlePassConfigured: boolean;
  moodlePassHint: string;
}

export interface WeeklySchedule {
  L: boolean;
  M: boolean;
  X: boolean;
  J: boolean;
  V: boolean;
  S: boolean;
  D: boolean;
}

export interface BotKPIs {
  pdfsGenerated: number;
  manualAlerts: number;
  frequencyMinutes: number;
  geminiThreads: number;
}

export interface BotState {
  status: BotStatus;
  currentStep: string;
  watching: boolean;
  intervalMinutes: number;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastError: string | null;
  itlaConnected: boolean;
  itlaSessionUser: string;
  activeThreads: number;
  weeklySchedule: WeeklySchedule;
  kpis: BotKPIs;
}

export interface DirectoryListing {
  currentPath: string;
  parentPath: string | null;
  directories: Array<{ name: string; path: string }>;
}

export interface OutputFileEntry {
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
  ext: string;
}

export interface BootstrapPayload {
  botState: BotState;
  tasks: TaskItem[];
  coverConfig: CoverConfig;
  profile: StudentProfile;
  settings: SystemSettings;
  credentials: CredentialsStatus;
  recentActivity: ActivityEvent[];
  logs: LogEntry[];
}
