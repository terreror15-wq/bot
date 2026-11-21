import * as cheerio from 'cheerio';
import type { TaskClassification, TaskItem } from '../src/types/botchase.ts';

export interface ParsedMoodleActivity {
  cmid: string;
  title: string;
  subject: string;
  dueDate: string;
  dueLabel: string;
  url: string;
  submissionStatus: string;
  description: string;
  classification: TaskClassification;
  reason: string;
  ignored: boolean;
  ignoreReason?: string;
}

const IGNORED_MOD_PATTERNS = [
  '/mod/quiz/',
  '/mod/forum/',
  '/mod/url/',
  '/mod/resource/',
];

const MANUAL_KEYWORDS = [
  'foto',
  'fotografía',
  'captura',
  'screenshot',
  'imagen',
  'video',
  'grabación',
  'archivo comprimido',
  '.zip',
  '.rar',
  'repositorio',
  'github',
  'figma',
  'packet tracer',
  '.pkt',
  'laboratorio práctico',
  'evidencia visual',
];

export function classifyTask(title: string, description: string): {
  classification: TaskClassification;
  reason: string;
} {
  const haystack = `${title} ${description}`.toLowerCase();
  const matched = MANUAL_KEYWORDS.filter((kw) => haystack.includes(kw));

  if (matched.length > 0) {
    return {
      classification: 'Manual',
      reason: `Requiere evidencia o archivo específico (${matched.slice(0, 3).join(', ')}). Se notifica por Telegram.`,
    };
  }

  return {
    classification: 'PDF',
    reason: 'Actividad de investigación o ensayo redactable; apta para generación automática de PDF y DOCX.',
  };
}

export function extractCmidFromUrl(url: string): string {
  const match = url.match(/[?&]id=(\d+)/);
  if (match) return match[1];
  const fallback = url.match(/(\d{4,7})/);
  return fallback ? fallback[1] : String(Math.floor(40000 + Math.random() * 9000));
}

/**
 * Parses Moodle calendar / upcoming events HTML or assignment detail HTML
 * enforcing AGENTS.md strict filtering:
 *  - Only `/mod/assign/view.php`
 *  - Ignore `/mod/quiz/`, `/mod/forum/`, `/mod/url/`, `/mod/resource/`
 *  - Skip `"Enviado para calificar"`
 */
export function parseMoodleHtml(html: string): {
  activities: ParsedMoodleActivity[];
  ignoredCount: number;
} {
  const $ = cheerio.load(html);
  const activities: ParsedMoodleActivity[] = [];
  let ignoredCount = 0;

  // 1) Look for Moodle calendar event cards or links
  const eventBlocks = $('.event, [data-type="event"], .card[data-event-id]');

  if (eventBlocks.length > 0) {
    eventBlocks.each((_, el) => {
      const node = $(el);
      const linkEl = node.find('a[href*="/mod/"]').first();
      const href = linkEl.attr('href') || '';
      if (!href) return;

      if (IGNORED_MOD_PATTERNS.some((p) => href.includes(p)) || !href.includes('/mod/assign/view.php')) {
        ignoredCount += 1;
        return;
      }

      const title =
        node.find('.name, h3, h4, [data-region="event-title"]').first().text().trim() ||
        linkEl.text().trim() ||
        'Tarea de Moodle';
      const subject =
        node.find('.course, a[href*="/course/view.php"]').first().text().trim() ||
        'Asignatura ITLA';
      const dueText =
        node.find('.date, time, [data-region="event-time"]').first().text().trim() ||
        new Date(Date.now() + 3 * 86400000).toLocaleDateString('es-DO');
      const submissionStatus =
        node.find('.submissionstatussubmitted, .status').text().trim() || 'Sin entrega';
      const description =
        node.find('.description, .event-description, p').text().trim() || title;

      if (submissionStatus.toLowerCase().includes('enviado para calificar')) {
        activities.push({
          cmid: extractCmidFromUrl(href),
          title,
          subject,
          dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
          dueLabel: dueText,
          url: href,
          submissionStatus: 'Enviado para calificar',
          description,
          classification: 'Omitida',
          reason: 'Estado Moodle: "Enviado para calificar". Omitida automáticamente.',
          ignored: true,
          ignoreReason: 'Enviado para calificar',
        });
        return;
      }

      const { classification, reason } = classifyTask(title, description);
      activities.push({
        cmid: extractCmidFromUrl(href),
        title,
        subject,
        dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
        dueLabel: dueText,
        url: href,
        submissionStatus,
        description,
        classification,
        reason,
        ignored: false,
      });
    });
  } else {
    // 2) Fallback: scan all /mod/ links or single assignment page
    const pageTitle = $('h1, h2, #page-header h1').first().text().trim();
    const assignLinks = $('a[href*="/mod/"]');

    if (assignLinks.length > 0) {
      const seen = new Set<string>();
      assignLinks.each((_, el) => {
        const href = $(el).attr('href') || '';
        if (IGNORED_MOD_PATTERNS.some((p) => href.includes(p)) || !href.includes('/mod/assign/view.php')) {
          if (href.includes('/mod/')) ignoredCount += 1;
          return;
        }
        const cmid = extractCmidFromUrl(href);
        if (seen.has(cmid)) return;
        seen.add(cmid);

        const title = $(el).text().trim() || pageTitle || `Actividad #${cmid}`;
        const { classification, reason } = classifyTask(title, title);
        activities.push({
          cmid,
          title,
          subject: $('a[href*="/course/view.php"]').first().text().trim() || 'Asignatura ITLAVIRTUAL',
          dueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
          dueLabel: 'Próxima entrega',
          url: href,
          submissionStatus: 'Sin entrega',
          description: title,
          classification,
          reason,
          ignored: false,
        });
      });
    } else if (pageTitle) {
      // Single assignment detail page
      const intro = $('#intro, .activity-description, .box.generalbox').text().trim() || pageTitle;
      const statusText = $('.submissionstatussubmitted, td.cell.c1').text().trim() || 'No entregado';
      const skipped = statusText.toLowerCase().includes('enviado para calificar');
      const { classification, reason } = classifyTask(pageTitle, intro);
      activities.push({
        cmid: String(Math.floor(48000 + Math.random() * 900)),
        title: pageTitle,
        subject: $('.breadcrumb a[href*="/course/"]').last().text().trim() || 'Asignatura ITLAVIRTUAL',
        dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
        dueLabel: 'Detectada desde HTML',
        url: 'https://aulavirtual.itla.edu.do/mod/assign/view.php?id=48900',
        submissionStatus: skipped ? 'Enviado para calificar' : 'Sin entrega',
        description: intro.slice(0, 400),
        classification: skipped ? 'Omitida' : classification,
        reason: skipped ? 'Ya enviada para calificar.' : reason,
        ignored: skipped,
      });
    }
  }

  return { activities, ignoredCount };
}

export function sortTasksByDueDate(tasks: TaskItem[]): TaskItem[] {
  return [...tasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}
