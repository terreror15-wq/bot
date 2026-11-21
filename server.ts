import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { botEngine } from './server/botEngine.ts';
import { ensureStarterDeliverables, persistAcademicTemplate } from './server/docGenerator.ts';
import { botLogger } from './server/logger.ts';
import { sortTasksByDueDate } from './server/moodleParser.ts';
import { DEFAULT_OUTPUT_DIR, stateStore } from './server/store.ts';
import type {
  BootstrapPayload,
  CoverConfig,
  DirectoryListing,
  OutputFileEntry,
  StudentProfile,
  SystemSettings,
  WeeklySchedule,
} from './src/types/botchase.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // Ensure initial starter PDF/DOCX artifacts exist on disk inside active outputDir
  const initial = stateStore.getState();
  await ensureStarterDeliverables(
    initial.tasks,
    initial.coverConfig,
    initial.profile,
    initial.settings.outputDir || DEFAULT_OUTPUT_DIR
  );

  // 1) Bootstrap full state
  app.get('/api/bootstrap', (_req, res) => {
    const s = stateStore.getState();
    const payload: BootstrapPayload = {
      botState: botEngine.getBotState(),
      tasks: sortTasksByDueDate(s.tasks),
      coverConfig: s.coverConfig,
      profile: s.profile,
      settings: s.settings,
      credentials: stateStore.getCredentialsStatus(),
      recentActivity: s.recentActivity,
      logs: botLogger.getAll(),
    };
    res.json(payload);
  });

  // 2) Unified SSE stream for real-time logs & bot state updates
  app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Initial state snapshot
    sendEvent('state', botEngine.getBotState());

    const onLog = (entry: unknown) => sendEvent('log', entry);
    const onLogsCleared = () => sendEvent('logs_cleared', {});
    const onState = (state: unknown) => {
      const s = stateStore.getState();
      sendEvent('state', state);
      sendEvent('tasks', sortTasksByDueDate(s.tasks));
      sendEvent('activity', s.recentActivity);
    };

    botLogger.on('entry', onLog);
    botLogger.on('cleared', onLogsCleared);
    botEngine.on('state', onState);

    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      botLogger.off('entry', onLog);
      botLogger.off('cleared', onLogsCleared);
      botEngine.off('state', onState);
    });
  });

  // 3) Bot Control endpoints (non-blocking async execution)
  app.post('/api/bot/watch/start', (req, res) => {
    const interval =
      typeof req.body?.intervalMinutes === 'number' ? req.body.intervalMinutes : undefined;
    const state = botEngine.startWatching(interval);
    res.json({ botState: state });
  });

  app.post('/api/bot/watch/stop', (_req, res) => {
    const state = botEngine.stopWatching();
    res.json({ botState: state });
  });

  app.post('/api/bot/interval', (req, res) => {
    const minutes = Number(req.body?.intervalMinutes);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 720) {
      res.status(400).json({ error: 'El intervalo debe estar entre 1 y 720 minutos.' });
      return;
    }
    const state = botEngine.setIntervalMinutes(minutes);
    res.json({ botState: state });
  });

  app.post('/api/bot/run-once', (_req, res) => {
    void botEngine.runCycle('Revisión manual');
    res.json({ started: true, botState: botEngine.getBotState() });
  });

  app.post('/api/bot/connect-itla', (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email : undefined;
    void botEngine.connectItla(email);
    res.json({ started: true, botState: botEngine.getBotState() });
  });

  app.post('/api/bot/schedule', (req, res) => {
    const weeklySchedule = req.body?.weeklySchedule as WeeklySchedule | undefined;
    if (!weeklySchedule) {
      res.status(400).json({ error: 'weeklySchedule requerido' });
      return;
    }
    stateStore.saveState((s) => ({
      ...s,
      weeklySchedule: { ...s.weeklySchedule, ...weeklySchedule },
    }));
    botLogger.info('Calendario', 'Días activos de vigilancia semanal actualizados.');
    botEngine.notifyStateUpdated();
    res.json({ weeklySchedule: stateStore.getState().weeklySchedule });
  });

  app.post('/api/bot/import-html', (req, res) => {
    const html = typeof req.body?.html === 'string' ? req.body.html : '';
    if (!html.trim()) {
      res.status(400).json({ error: 'Pega un fragmento HTML válido de Moodle.' });
      return;
    }
    const result = botEngine.importHtmlAndScan(html);
    res.json({
      ...result,
      tasks: sortTasksByDueDate(stateStore.getState().tasks),
    });
  });

  app.post('/api/logs/clear', (_req, res) => {
    botLogger.clear();
    botLogger.info('Consola', 'Historial de consola limpiado.');
    res.json({ ok: true });
  });

  // 4) Tasks endpoints
  app.post('/api/tasks/:cmid/retry', (req, res) => {
    const { cmid } = req.params;
    const exists = stateStore.getState().tasks.some((t) => t.cmid === cmid);
    if (!exists) {
      res.status(404).json({ error: `Tarea #${cmid} no encontrada.` });
      return;
    }
    void botEngine.retryTask(cmid);
    res.json({ started: true, cmid });
  });

  // 5) Cover PDF Studio endpoints
  app.post('/api/cover', (req, res) => {
    const coverConfig = req.body?.coverConfig as CoverConfig | undefined;
    if (!coverConfig) {
      res.status(400).json({ error: 'coverConfig requerido.' });
      return;
    }
    const updated = stateStore.saveState((s) => ({
      ...s,
      coverConfig: {
        ...s.coverConfig,
        ...coverConfig,
        fields: { ...s.coverConfig.fields, ...(coverConfig.fields || {}) },
      },
    }));

    const templatePath = persistAcademicTemplate(updated.coverConfig, updated.profile);
    stateStore.addActivity({
      title: 'Plantilla de portada PDF guardada',
      detail: `Estilo "${updated.coverConfig.style}" exportado a academic_template.html`,
      kind: 'template',
    });
    botLogger.info(
      'PortadaStudio',
      `Plantilla real exportada (${updated.coverConfig.style}) en ${templatePath}`
    );
    botEngine.notifyStateUpdated();

    res.json({
      coverConfig: updated.coverConfig,
      templatePath,
    });
  });

  // 6) Student Profile & Logo endpoints
  app.post('/api/profile', (req, res) => {
    const profile = req.body?.profile as Partial<StudentProfile> | undefined;
    if (!profile) {
      res.status(400).json({ error: 'profile requerido.' });
      return;
    }
    const updated = stateStore.saveState((s) => ({
      ...s,
      profile: { ...s.profile, ...profile },
    }));
    persistAcademicTemplate(updated.coverConfig, updated.profile);
    botLogger.info('Perfil', `Perfil actualizado: ${updated.profile.fullName} (${updated.profile.matricula}).`);
    botEngine.notifyStateUpdated();
    res.json({ profile: updated.profile });
  });

  // 7) Settings & Credentials endpoints
  app.post('/api/settings', (req, res) => {
    const settings = req.body?.settings as Partial<SystemSettings> | undefined;
    if (!settings) {
      res.status(400).json({ error: 'settings requerido.' });
      return;
    }

    if (settings.outputDir) {
      const resolved = path.resolve(settings.outputDir);
      if (!fs.existsSync(resolved)) {
        fs.mkdirSync(resolved, { recursive: true });
      }
      settings.outputDir = resolved;
    }

    const updated = stateStore.saveState((s) => ({
      ...s,
      settings: {
        ...s.settings,
        ...settings,
        geminiThreads: Math.max(1, Math.min(4, Number(settings.geminiThreads ?? s.settings.geminiThreads))),
        defaultIntervalMinutes: Math.max(
          1,
          Math.min(720, Number(settings.defaultIntervalMinutes ?? s.settings.defaultIntervalMinutes))
        ),
      },
    }));

    botLogger.info(
      'Ajustes',
      `Configuración guardada · Carpeta salida: ${updated.settings.outputDir} · Hilos Gemini: ${updated.settings.geminiThreads}.`
    );
    botEngine.notifyStateUpdated();

    res.json({
      settings: updated.settings,
      botState: botEngine.getBotState(),
    });
  });

  app.post('/api/credentials', (req, res) => {
    const { telegramBotToken, telegramChatId, moodleUser, moodlePass } = req.body || {};
    const status = stateStore.updateSecrets({
      telegramBotToken,
      telegramChatId,
      moodleUser,
      moodlePass,
    });
    botLogger.info('Seguridad', 'Credenciales locales actualizadas de forma segura en el servidor.');
    res.json({ credentials: status });
  });

  app.post('/api/credentials/clear', (req, res) => {
    const field = req.body?.field;
    if (!['telegramBotToken', 'telegramChatId', 'moodleUser', 'moodlePass'].includes(field)) {
      res.status(400).json({ error: 'Campo inválido.' });
      return;
    }
    const status = stateStore.clearSecret(field);
    botLogger.info('Seguridad', `Credencial ${field} eliminada localmente.`);
    res.json({ credentials: status });
  });

  app.post('/api/telegram/test', async (_req, res) => {
    const result = await botEngine.sendTestTelegram();
    res.json(result);
  });

  // 8) File System Directory Browser & Output Folder Explorer
  app.get('/api/fs/browse', (req, res) => {
    const requested = typeof req.query.path === 'string' && req.query.path.trim()
      ? path.resolve(req.query.path)
      : stateStore.getState().settings.outputDir || process.cwd();

    const targetDir = fs.existsSync(requested) && fs.statSync(requested).isDirectory()
      ? requested
      : process.cwd();

    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    const directories = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
      .map((e) => ({
        name: e.name,
        path: path.join(targetDir, e.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const parent = path.dirname(targetDir);
    const listing: DirectoryListing = {
      currentPath: targetDir,
      parentPath: parent !== targetDir ? parent : null,
      directories,
    };
    res.json(listing);
  });

  app.post('/api/fs/mkdir', (req, res) => {
    const parentPath = typeof req.body?.parentPath === 'string' ? req.body.parentPath : process.cwd();
    const folderName = typeof req.body?.folderName === 'string' ? req.body.folderName.trim() : '';
    if (!folderName || /[\\/:*?"<>|]/.test(folderName)) {
      res.status(400).json({ error: 'Nombre de carpeta inválido.' });
      return;
    }
    const newPath = path.resolve(parentPath, folderName);
    if (!fs.existsSync(newPath)) {
      fs.mkdirSync(newPath, { recursive: true });
    }
    botLogger.info('Sistema', `Carpeta creada en disco: ${newPath}`);
    res.json({ path: newPath });
  });

  app.get('/api/files/output', (_req, res) => {
    const outputDir = stateStore.getState().settings.outputDir || DEFAULT_OUTPUT_DIR;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const entries = fs.readdirSync(outputDir, { withFileTypes: true });
    const files: OutputFileEntry[] = entries
      .filter((e) => e.isFile())
      .map((e) => {
        const fullPath = path.join(outputDir, e.name);
        const stat = fs.statSync(fullPath);
        return {
          name: e.name,
          path: fullPath,
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
          ext: path.extname(e.name).toLowerCase(),
        };
      })
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

    res.json({ outputDir, files, platform: os.platform() });
  });

  app.get('/api/files/view', (req, res) => {
    const fileName = typeof req.query.name === 'string' ? path.basename(req.query.name) : '';
    const customDir = typeof req.query.dir === 'string' && req.query.dir.trim()
      ? path.resolve(req.query.dir)
      : stateStore.getState().settings.outputDir || DEFAULT_OUTPUT_DIR;

    if (!fileName) {
      res.status(400).send('Nombre de archivo requerido.');
      return;
    }

    let filePath = path.join(customDir, fileName);
    if (!fs.existsSync(filePath)) {
      // Fallback to active outputDir if file was generated after path change
      const fallbackPath = path.join(stateStore.getState().settings.outputDir || DEFAULT_OUTPUT_DIR, fileName);
      if (fs.existsSync(fallbackPath)) {
        filePath = fallbackPath;
      } else {
        res.status(404).send('Archivo no encontrado.');
        return;
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    } else if (ext === '.docx') {
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    } else if (ext === '.html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }

    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    }

    fs.createReadStream(filePath).pipe(res);
  });

  // Vite middleware in development, static dist/ in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BotChase server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start BotChase server:', err);
  process.exit(1);
});
