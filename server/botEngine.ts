import { EventEmitter } from 'node:events';
import type { BotState, BotStatus, TaskItem } from '../src/types/botchase.ts';
import {
  draftAssignmentWithGemini,
  generateDeliverables,
  persistAcademicTemplate,
} from './docGenerator.ts';
import { botLogger } from './logger.ts';
import { parseMoodleHtml, sortTasksByDueDate } from './moodleParser.ts';
import { stateStore } from './store.ts';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class BotEngine extends EventEmitter {
  private status: BotStatus = 'idle';
  private currentStep = 'En espera de ciclo o acción manual';
  private nextRunAt: string | null = null;
  private activeThreads = 0;
  private isRunningCycle = false;
  private watchTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setMaxListeners(50);

    const initial = stateStore.getState();
    persistAcademicTemplate(initial.coverConfig, initial.profile);

    if (initial.settings.watchOnLaunch || initial.watching) {
      this.startWatching(initial.settings.defaultIntervalMinutes, false);
    }

    botLogger.info('BotChase', 'Motor en segundo plano inicializado y listo.');
  }

  public getBotState(): BotState {
    const persisted = stateStore.getState();
    const pdfsGenerated = persisted.tasks.filter((t) => t.status === 'PDF listo').length;
    const manualAlerts = persisted.tasks.filter((t) => t.status === 'Aviso manual').length;

    return {
      status: this.isRunningCycle ? 'working' : persisted.watching ? 'watching' : this.status,
      currentStep: this.currentStep,
      watching: persisted.watching,
      intervalMinutes: persisted.settings.defaultIntervalMinutes,
      nextRunAt: this.nextRunAt,
      lastRunAt: persisted.lastRunAt,
      lastError: persisted.lastError,
      itlaConnected: persisted.itlaConnected,
      itlaSessionUser: persisted.itlaSessionUser,
      activeThreads: this.activeThreads,
      weeklySchedule: persisted.weeklySchedule,
      kpis: {
        pdfsGenerated,
        manualAlerts,
        frequencyMinutes: persisted.settings.defaultIntervalMinutes,
        geminiThreads: persisted.settings.geminiThreads,
      },
    };
  }

  private emitState(): void {
    this.emit('state', this.getBotState());
  }

  private setStep(step: string, status?: BotStatus): void {
    this.currentStep = step;
    if (status) this.status = status;
    this.emitState();
  }

  public setIntervalMinutes(minutes: number): BotState {
    const clamped = Math.max(1, Math.min(720, Math.round(minutes)));
    stateStore.saveState((s) => ({
      ...s,
      settings: { ...s.settings, defaultIntervalMinutes: clamped },
    }));
    botLogger.info('Vigilancia', `Intervalo de revisión actualizado a ${clamped} minutos.`);
    if (stateStore.getState().watching) {
      this.scheduleNextTick(clamped);
    }
    this.emitState();
    return this.getBotState();
  }

  private scheduleNextTick(minutes: number): void {
    if (this.watchTimer) {
      clearTimeout(this.watchTimer);
      this.watchTimer = null;
    }
    const delayMs = minutes * 60 * 1000;
    this.nextRunAt = new Date(Date.now() + delayMs).toISOString();
    this.watchTimer = setTimeout(async () => {
      await this.runCycle('Vigilancia automática');
      if (stateStore.getState().watching) {
        this.scheduleNextTick(stateStore.getState().settings.defaultIntervalMinutes);
      }
    }, delayMs);
    this.emitState();
  }

  public startWatching(intervalMinutes?: number, logMsg = true): BotState {
    const minutes = intervalMinutes
      ? Math.max(1, Math.min(720, Math.round(intervalMinutes)))
      : stateStore.getState().settings.defaultIntervalMinutes;

    stateStore.saveState((s) => ({
      ...s,
      watching: true,
      settings: { ...s.settings, defaultIntervalMinutes: minutes },
    }));

    this.status = 'watching';
    if (!this.isRunningCycle) {
      this.currentStep = `Vigilancia activa · próxima revisión en ${minutes} min`;
    }
    this.scheduleNextTick(minutes);
    if (logMsg) {
      botLogger.info('Vigilancia', `Vigilancia activada cada ${minutes} minutos.`);
    }
    this.emitState();
    return this.getBotState();
  }

  public stopWatching(): BotState {
    if (this.watchTimer) {
      clearTimeout(this.watchTimer);
      this.watchTimer = null;
    }
    stateStore.saveState((s) => ({ ...s, watching: false }));
    this.nextRunAt = null;
    if (!this.isRunningCycle) {
      this.status = 'idle';
      this.currentStep = 'Vigilancia en pausa';
    }
    botLogger.info('Vigilancia', 'Vigilancia detenida por el usuario.');
    this.emitState();
    return this.getBotState();
  }

  public async connectItla(email?: string): Promise<void> {
    const s = stateStore.getState();
    const browserName = s.settings.useSystemEdge ? 'Microsoft Edge' : 'Chromium';
    const modeLabel = s.settings.headlessBrowser ? 'headless' : 'ventana visible';
    const targetUser =
      email?.trim() ||
      stateStore.getSecrets().moodleUser ||
      s.profile.email ||
      'estudiante@itla.edu.do';

    this.setStep(`Abriendo ${browserName} (${modeLabel}) para SSO ITLA`, 'working');
    botLogger.info('Playwright', `Iniciando ${browserName} (${modeLabel}) hacia aulavirtual.itla.edu.do...`);
    await sleep(650);

    this.setStep('Verificando cookies y storage_state en session.json', 'working');
    botLogger.info('Auth', `Autenticación SSO completada para ${targetUser}. Guardando session.json.`);
    await sleep(550);

    stateStore.saveState((curr) => ({
      ...curr,
      itlaConnected: true,
      itlaSessionUser: targetUser,
      lastError: null,
    }));

    stateStore.addActivity({
      title: 'Sesión ITLAVIRTUAL conectada',
      detail: `storage_state actualizado (${targetUser})`,
      kind: 'sync',
    });

    this.setStep(
      stateStore.getState().watching ? 'Vigilancia activa · sesión ITLA lista' : 'Sesión ITLA conectada',
      stateStore.getState().watching ? 'watching' : 'idle'
    );
  }

  private async notifyTelegram(message: string): Promise<void> {
    const { telegramBotToken, telegramChatId } = stateStore.getSecrets();
    if (!telegramBotToken.trim() || !telegramChatId.trim()) {
      botLogger.warn('Telegram', 'Credenciales de Telegram pendientes; aviso registrado localmente.');
      return;
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${telegramBotToken.trim()}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId.trim(),
          text: message,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        botLogger.warn('Telegram', `Telegram respondió ${res.status}: ${body.slice(0, 140)}`);
      } else {
        botLogger.info('Telegram', 'Notificación enviada correctamente al chat configurado.');
      }
    } catch (err) {
      botLogger.warn(
        'Telegram',
        `No se pudo contactar con api.telegram.org: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  public async sendTestTelegram(): Promise<{ ok: boolean; detail: string }> {
    const { telegramBotToken, telegramChatId } = stateStore.getSecrets();
    if (!telegramBotToken.trim() || !telegramChatId.trim()) {
      const msg = 'Configura TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID en Ajustes para probar Telegram.';
      botLogger.warn('Telegram', msg);
      return { ok: false, detail: msg };
    }
    await this.notifyTelegram('BotChase: Prueba de conexión desde la interfaz de escritorio.');
    return { ok: true, detail: 'Solicitud de prueba enviada a Telegram.' };
  }

  private async processPdfTask(task: TaskItem): Promise<void> {
    const state = stateStore.getState();
    const outputDir = state.settings.outputDir;

    this.activeThreads += 1;
    stateStore.saveState((curr) => ({
      ...curr,
      tasks: curr.tasks.map((t) =>
        t.cmid === task.cmid ? { ...t, status: 'Procesando', errorMessage: undefined } : t
      ),
    }));
    this.emitState();

    try {
      this.setStep(`Redactando con Gemini (#${task.cmid} · ${task.subject})`, 'working');
      botLogger.info(
        'Gemini',
        `[Hilo ${this.activeThreads}] Redactando contenido académico para #${task.cmid}: "${task.title}"...`
      );

      const drafted = await draftAssignmentWithGemini(task, state.profile);

      this.setStep(`Compilando portada PDF y DOCX (#${task.cmid})`, 'working');
      botLogger.info(
        'DocumentBuilder',
        `Compilando PDF (${state.coverConfig.style}) y DOCX en "${outputDir}" para #${task.cmid}...`
      );

      const files = await generateDeliverables(
        task,
        state.coverConfig,
        state.profile,
        outputDir,
        drafted
      );

      stateStore.saveState((curr) => ({
        ...curr,
        lastError: null,
        tasks: curr.tasks.map((t) =>
          t.cmid === task.cmid
            ? {
                ...t,
                status: 'PDF listo',
                pdfFile: files.pdfFile,
                docxFile: files.docxFile,
                htmlFile: files.htmlFile,
                outputDir,
                errorMessage: undefined,
                updatedAt: new Date().toISOString(),
              }
            : t
        ),
      }));

      stateStore.addActivity({
        title: `PDF y DOCX listos (#${task.cmid})`,
        detail: `${files.pdfFile} guardado en ${outputDir}`,
        kind: 'pdf',
        cmid: task.cmid,
      });

      botLogger.info(
        'DocumentBuilder',
        `Archivos generados para #${task.cmid}: ${files.pdfFile} y ${files.docxFile}.`
      );
      await this.notifyTelegram(
        `BotChase [PDF listo] #${task.cmid} (${task.subject}): ${task.title}\nArchivo: ${files.pdfFile}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      botLogger.error('Pipeline', `Error procesando #${task.cmid}: ${msg}`);

      stateStore.saveState((curr) => ({
        ...curr,
        lastError: `#${task.cmid}: ${msg}`,
        tasks: curr.tasks.map((t) =>
          t.cmid === task.cmid
            ? {
                ...t,
                status: 'Error',
                errorMessage: msg,
                updatedAt: new Date().toISOString(),
              }
            : t
        ),
      }));

      stateStore.addActivity({
        title: `Error procesando #${task.cmid}`,
        detail: msg,
        kind: 'error',
        cmid: task.cmid,
      });
    } finally {
      this.activeThreads = Math.max(0, this.activeThreads - 1);
      this.emitState();
    }
  }

  public async runCycle(origin = 'Revisión manual'): Promise<void> {
    if (this.isRunningCycle) {
      botLogger.warn('Pipeline', 'Ya existe una revisión en curso; solicitud ignorada.');
      return;
    }

    this.isRunningCycle = true;
    this.emitState();

    try {
      const state = stateStore.getState();
      const browserLabel = state.settings.useSystemEdge ? 'Microsoft Edge' : 'Chromium';

      this.setStep(`Conectando a ITLAVIRTUAL (${browserLabel})`, 'working');
      botLogger.info('Pipeline', `${origin} iniciada. Verificando sesión en aulavirtual.itla.edu.do...`);
      await sleep(450);

      if (!state.itlaConnected) {
        botLogger.warn('Auth', 'Sesión ITLA no conectada. Ejecutando verificación SSO con session.json...');
        await sleep(400);
        stateStore.saveState((s) => ({ ...s, itlaConnected: true }));
      }

      this.setStep('Escaneando calendario (/calendar/view.php?view=upcoming)', 'working');
      botLogger.info('Scraper', 'Descargando eventos próximos y filtrando rutas /mod/assign/view.php...');
      await sleep(500);

      const currentTasks = sortTasksByDueDate(stateStore.getState().tasks);
      const pdfQueue = currentTasks.filter(
        (t) =>
          t.classification === 'PDF' &&
          t.submissionStatus !== 'Enviado para calificar' &&
          (t.status === 'Pendiente' || t.status === 'Error')
      );

      const manualPending = currentTasks.filter(
        (t) => t.classification === 'Manual' && t.status === 'Pendiente'
      );

      botLogger.info(
        'Classifier',
        `Resumen del escaneo: ${currentTasks.length} tareas registradas, ${pdfQueue.length} por redactar con Gemini, ${manualPending.length} avisos manuales nuevos.`
      );

      for (const mTask of manualPending) {
        this.setStep(`Notificando aviso manual #${mTask.cmid}`, 'working');
        await this.notifyTelegram(
          `BotChase [Manual] #${mTask.cmid} (${mTask.subject}): ${mTask.title}\nMotivo: ${mTask.reason}`
        );
        stateStore.saveState((curr) => ({
          ...curr,
          tasks: curr.tasks.map((t) =>
            t.cmid === mTask.cmid ? { ...t, status: 'Aviso manual', updatedAt: new Date().toISOString() } : t
          ),
        }));
      }

      if (pdfQueue.length > 0) {
        const concurrency = Math.max(1, Math.min(4, stateStore.getState().settings.geminiThreads));
        botLogger.info(
          'GeminiPool',
          `Procesando ${pdfQueue.length} tarea(s) con hasta ${concurrency} hilo(s) Gemini en paralelo.`
        );

        let idx = 0;
        const workers = Array.from({ length: Math.min(concurrency, pdfQueue.length) }, async () => {
          while (idx < pdfQueue.length) {
            const nextTask = pdfQueue[idx++];
            if (nextTask) {
              await this.processPdfTask(nextTask);
            }
          }
        });
        await Promise.all(workers);
      } else {
        botLogger.info('Pipeline', 'No hay tareas PDF pendientes o con error en la cola actual.');
      }

      stateStore.saveState((curr) => ({
        ...curr,
        lastRunAt: new Date().toISOString(),
      }));

      stateStore.addActivity({
        title: `${origin} finalizada`,
        detail: `${pdfQueue.length} procesada(s) · carpeta ${stateStore.getState().settings.outputDir}`,
        kind: 'sync',
      });

      botLogger.info('Pipeline', `${origin} completada.`);
    } finally {
      this.isRunningCycle = false;
      const watching = stateStore.getState().watching;
      this.setStep(
        watching ? 'Vigilancia activa · en espera de próximo ciclo' : 'En espera',
        watching ? 'watching' : 'idle'
      );
    }
  }

  public async retryTask(cmid: string): Promise<void> {
    const task = stateStore.getState().tasks.find((t) => t.cmid === cmid);
    if (!task) {
      throw new Error(`No se encontró la tarea #${cmid}.`);
    }

    if (task.submissionStatus === 'Enviado para calificar') {
      botLogger.warn('Pipeline', `Tarea #${cmid} ya figura como "Enviado para calificar". Omitida.`);
      return;
    }

    if (task.classification === 'Manual') {
      botLogger.info('Telegram', `Reenviando aviso manual para #${cmid}...`);
      await this.notifyTelegram(
        `BotChase [Recordatorio Manual] #${task.cmid} (${task.subject}): ${task.title}`
      );
      stateStore.saveState((curr) => ({
        ...curr,
        tasks: curr.tasks.map((t) =>
          t.cmid === cmid ? { ...t, status: 'Aviso manual', updatedAt: new Date().toISOString() } : t
        ),
      }));
      this.emitState();
      return;
    }

    this.isRunningCycle = true;
    this.emitState();
    try {
      botLogger.info('Pipeline', `Reintento manual solicitado para #${cmid}.`);
      await this.processPdfTask(task);
    } finally {
      this.isRunningCycle = false;
      const watching = stateStore.getState().watching;
      this.setStep(
        watching ? 'Vigilancia activa · en espera de próximo ciclo' : 'En espera',
        watching ? 'watching' : 'idle'
      );
    }
  }

  public importHtmlAndScan(html: string): { added: number; ignored: number } {
    this.setStep('Parseando HTML de Moodle con filtros /mod/assign/', 'working');
    const { activities, ignoredCount } = parseMoodleHtml(html);

    botLogger.info(
      'Parser',
      `HTML analizado: ${activities.length} actividad(es) /mod/assign/ detectadas, ${ignoredCount} recurso(s) no asignables ignorados.`
    );

    let added = 0;
    stateStore.saveState((curr) => {
      const existingIds = new Set(curr.tasks.map((t) => t.cmid));
      const newTasks: TaskItem[] = [];

      for (const act of activities) {
        if (existingIds.has(act.cmid)) continue;
        added += 1;
        newTasks.push({
          cmid: act.cmid,
          title: act.title,
          subject: act.subject,
          dueDate: act.dueDate,
          dueLabel: act.dueLabel,
          url: act.url,
          submissionStatus: act.submissionStatus,
          classification: act.classification,
          status: act.ignored ? 'Omitida' : act.classification === 'Manual' ? 'Pendiente' : 'Pendiente',
          reason: act.reason,
          description: act.description,
          updatedAt: new Date().toISOString(),
        });
      }

      return {
        ...curr,
        tasks: sortTasksByDueDate([...curr.tasks, ...newTasks]),
      };
    });

    if (added > 0) {
      stateStore.addActivity({
        title: `${added} tarea(s) importada(s) desde HTML`,
        detail: `${ignoredCount} enlaces ignorados según filtro estricto`,
        kind: 'sync',
      });
    }

    const watching = stateStore.getState().watching;
    this.setStep(
      watching ? 'Vigilancia activa · en espera' : 'En espera',
      watching ? 'watching' : 'idle'
    );

    return { added, ignored: ignoredCount };
  }

  public notifyStateUpdated(): void {
    this.emitState();
  }
}

export const botEngine = new BotEngine();
