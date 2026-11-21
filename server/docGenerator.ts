import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI, Type } from '@google/genai';
import PDFDocument from 'pdfkit';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  TextRun,
} from 'docx';
import type { CoverConfig, StudentProfile, TaskItem } from '../src/types/botchase.ts';

export interface DraftedAcademicContent {
  abstract: string;
  sections: Array<{
    heading: string;
    paragraphs: string[];
  }>;
  conclusion: string;
  references: string[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const TEMPLATE_OUTPUT_PATH = path.join(DATA_DIR, 'academic_template.html');

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeFilename(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 52);
}

/**
 * Generates and persists the real HTML cover + document template (`academic.html`)
 * used for rendering previews and exporting academic documents.
 */
export function buildAcademicHtmlTemplate(
  cover: CoverConfig,
  profile: StudentProfile,
  opts?: {
    title?: string;
    subject?: string;
    professor?: string;
    sectionCode?: string;
    dueDateLabel?: string;
    content?: DraftedAcademicContent;
  }
): string {
  const fontStack =
    cover.fontFamily === 'serif'
      ? "'Source Serif 4', Georgia, serif"
      : "'Plus Jakarta Sans', 'DM Sans', sans-serif";

  const title = opts?.title || profile.previewTitle || 'Trabajo de Investigación Académica';
  const subject = opts?.subject || profile.previewSubject || 'Asignatura Universitaria';
  const professor = opts?.professor || profile.previewProfessor || 'Docente Titular';
  const sectionCode = opts?.sectionCode || profile.previewSection || 'SEC-01';
  const dueDateLabel =
    opts?.dueDateLabel ||
    new Date().toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const logoDim = cover.logoSize === 'small' ? 54 : cover.logoSize === 'large' ? 96 : 74;
  const initials = profile.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  const logoMarkup =
    profile.logoType === 'upload' && profile.logoDataUrl
      ? `<img src="${profile.logoDataUrl}" alt="Logo institucional" style="width:${logoDim}px;height:${logoDim}px;object-fit:contain;" />`
      : `<div style="width:${logoDim}px;height:${logoDim}px;border-radius:12px;border:2px solid ${cover.primaryColor};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${Math.round(logoDim * 0.34)}px;color:${cover.primaryColor};margin:0 auto;">${escapeHtml(initials || 'IT')}</div>`;

  const tocItems = opts?.content
    ? opts.content.sections.map((s, idx) => `<li><span>${idx + 1}. ${escapeHtml(s.heading)}</span><span>Pág. ${idx + 3}</span></li>`).join('')
    : `<li><span>1. Introducción y contexto técnico</span><span>Pág. 3</span></li>
       <li><span>2. Desarrollo conceptual y análisis</span><span>Pág. 4</span></li>
       <li><span>3. Conclusiones</span><span>Pág. 5</span></li>
       <li><span>4. Referencias bibliográficas</span><span>Pág. 6</span></li>`;

  const bodyMarkup = opts?.content
    ? `
      <section class="body-page">
        <h2>Resumen Ejecutivo</h2>
        <p>${escapeHtml(opts.content.abstract)}</p>
        ${opts.content.sections
          .map(
            (sec, idx) => `
          <h2>${idx + 1}. ${escapeHtml(sec.heading)}</h2>
          ${sec.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
        `
          )
          .join('')}
        <h2>Conclusiones</h2>
        <p>${escapeHtml(opts.content.conclusion)}</p>
        <h2>Referencias</h2>
        <ul>
          ${opts.content.references.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}
        </ul>
      </section>
    `
    : '';

  const styleBanner =
    cover.style === 'ejecutiva'
      ? `border-left: 14px solid ${cover.primaryColor};`
      : cover.style === 'editorial'
      ? `border: 2px solid ${cover.primaryColor}; padding: 48px;`
      : cover.style === 'minimalista'
      ? `border-top: 4px solid ${cover.accentColor};`
      : `border-top: 8px solid ${cover.primaryColor}; border-bottom: 4px solid ${cover.accentColor};`;

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: letter; margin: 2.2cm; }
    body { font-family: ${fontStack}; color: #111827; margin: 0; padding: 0; line-height: 1.6; }
    .cover { min-height: 92vh; display: flex; flex-direction: column; justify-content: space-between; padding: 42px; box-sizing: border-box; ${styleBanner} }
    .header-note { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; text-align: center; }
    .institution { font-size: 19px; font-weight: 700; color: ${cover.primaryColor}; margin: 14px 0 4px; text-align: center; }
    .faculty { font-size: 14px; color: #374151; text-align: center; margin: 0; }
    .main-title { font-size: 26px; font-weight: 700; color: #0f172a; text-align: center; margin: 28px 0 10px; }
    .subject { font-size: 15px; font-weight: 600; color: ${cover.accentColor}; text-align: center; }
    .meta-table { margin: 24px auto; width: 80%; border-top: 1px solid #e5e7eb; padding-top: 18px; font-size: 13px; }
    .meta-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f3f4f6; }
    .footer-note { font-size: 11px; color: #6b7280; text-align: center; }
    .toc-page, .body-page { page-break-before: always; padding: 36px 48px; }
    .toc-list { list-style: none; padding: 0; }
    .toc-list li { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #d1d5db; }
  </style>
</head>
<body>
  <section class="cover">
    <div>
      ${cover.headerText ? `<div class="header-note">${escapeHtml(cover.headerText)}</div>` : ''}
      <div style="margin-top:22px;text-align:center;">${logoMarkup}</div>
      ${cover.fields.institucion ? `<h1 class="institution">${escapeHtml(profile.institution)}</h1>` : ''}
      ${cover.fields.carrera ? `<p class="faculty">${escapeHtml(profile.faculty)}</p>` : ''}
    </div>

    <div>
      ${cover.fields.asignatura ? `<div class="subject">${escapeHtml(subject)}</div>` : ''}
      ${cover.fields.titulo ? `<h2 class="main-title">${escapeHtml(title)}</h2>` : ''}
    </div>

    <div>
      <div class="meta-table">
        ${cover.fields.sustentante ? `<div class="meta-row"><strong>Sustentante</strong><span>${escapeHtml(profile.fullName)}</span></div>` : ''}
        ${cover.fields.matricula ? `<div class="meta-row"><strong>Matrícula</strong><span>${escapeHtml(profile.matricula)}</span></div>` : ''}
        ${cover.fields.docente ? `<div class="meta-row"><strong>Docente</strong><span>${escapeHtml(professor)}</span></div>` : ''}
        ${cover.fields.seccion ? `<div class="meta-row"><strong>Sección / Código</strong><span>${escapeHtml(sectionCode)}</span></div>` : ''}
        ${cover.fields.fecha ? `<div class="meta-row"><strong>Fecha de entrega</strong><span>${escapeHtml(dueDateLabel)}</span></div>` : ''}
      </div>
      <div class="footer-note">
        ${escapeHtml(cover.footerText || '')}
        ${cover.fields.paginaUno ? ' · Página 1' : ''}
      </div>
    </div>
  </section>
  ${
    cover.fields.indiceTematico
      ? `<section class="toc-page"><h2>Índice Temático</h2><ul class="toc-list">${tocItems}</ul></section>`
      : ''
  }
  ${bodyMarkup}
</body>
</html>`;

  return html;
}

export function persistAcademicTemplate(cover: CoverConfig, profile: StudentProfile): string {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const html = buildAcademicHtmlTemplate(cover, profile);
  fs.writeFileSync(TEMPLATE_OUTPUT_PATH, html, 'utf-8');
  return TEMPLATE_OUTPUT_PATH;
}

/**
 * Calls server-side Gemini SDK (`@google/genai`, `gemini-4-hydrogen`) to draft structured academic work.
 */
export async function draftAssignmentWithGemini(
  task: TaskItem,
  profile: StudentProfile
): Promise<DraftedAcademicContent> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error(
      'GEMINI_API_KEY no está configurada en el entorno del servidor. Configúrala en Settings > Secrets.'
    );
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const prompt = [
    `Eres un redactor académico universitario de nivel superior en español para el estudiante ${profile.fullName} (${profile.faculty}, ${profile.institution}).`,
    `Redacta un trabajo académico completo, riguroso y bien estructurado para la siguiente actividad de ITLAVIRTUAL:`,
    `Asignatura: ${task.subject}`,
    `Título: ${task.title}`,
    `Consigna / Descripción: ${task.description}`,
    `Requisitos de salida:`,
    `- Un resumen ejecutivo conciso (1 párrafo).`,
    `- Entre 3 y 4 secciones temáticas sustantivas, cada una con 2 a 3 párrafos claros, técnicos y sin relleno.`,
    `- Una conclusión académica sólida (1 párrafo).`,
    `- 3 referencias bibliográficas en formato APA 7.`,
  ].join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'Responde únicamente con JSON válido acorde al esquema. Redacta en español académico claro, técnico y preciso.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          abstract: { type: Type.STRING, description: 'Resumen ejecutivo del trabajo.' },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                heading: { type: Type.STRING },
                paragraphs: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['heading', 'paragraphs'],
            },
          },
          conclusion: { type: Type.STRING },
          references: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['abstract', 'sections', 'conclusion', 'references'],
      },
    },
  });

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('Gemini devolvió una respuesta vacía.');
  }

  const parsed = JSON.parse(rawText) as DraftedAcademicContent;
  if (!parsed.sections || parsed.sections.length === 0) {
    throw new Error('El esquema devuelto por Gemini no contiene secciones válidas.');
  }
  return parsed;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [30, 58, 138];
  const r = parseInt(clean.slice(0, 2), 16) || 30;
  const g = parseInt(clean.slice(2, 4), 16) || 58;
  const b = parseInt(clean.slice(4, 6), 16) || 138;
  return [r, g, b];
}

/**
 * Generates both real `.pdf` (via PDFKit) and real `.docx` (via docx) into `outputDir`.
 */
export async function generateDeliverables(
  task: TaskItem,
  cover: CoverConfig,
  profile: StudentProfile,
  outputDir: string,
  content: DraftedAcademicContent
): Promise<{ pdfFile: string; docxFile: string; htmlFile: string }> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const baseName = `${task.cmid}_${sanitizeFilename(task.title)}`;
  const pdfFile = `${baseName}.pdf`;
  const docxFile = `${baseName}.docx`;
  const htmlFile = `${baseName}.html`;

  const pdfPath = path.join(outputDir, pdfFile);
  const docxPath = path.join(outputDir, docxFile);
  const htmlPath = path.join(outputDir, htmlFile);

  // 1) Save HTML artifact
  const htmlContent = buildAcademicHtmlTemplate(cover, profile, {
    title: task.title,
    subject: task.subject,
    professor: task.professor,
    sectionCode: task.sectionCode,
    dueDateLabel: task.dueLabel,
    content,
  });
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');

  // 2) Compile PDF with PDFKit matching cover config
  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 60 });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    const primaryRgb = hexToRgb(cover.primaryColor);
    const accentRgb = hexToRgb(cover.accentColor);
    const serifFont = cover.fontFamily === 'serif' ? 'Times-Roman' : 'Helvetica';
    const serifBold = cover.fontFamily === 'serif' ? 'Times-Bold' : 'Helvetica-Bold';
    const pageW = doc.page.width;
    const pageH = doc.page.height;

    // Cover page style framing
    if (cover.style === 'clasica') {
      doc.rect(0, 0, pageW, 14).fill(primaryRgb);
      doc.rect(60, pageH - 42, pageW - 120, 3).fill(accentRgb);
    } else if (cover.style === 'minimalista') {
      doc.rect(60, 48, 84, 4).fill(accentRgb);
    } else if (cover.style === 'ejecutiva') {
      doc.rect(0, 0, 26, pageH).fill(primaryRgb);
      doc.rect(26, 0, 5, pageH).fill(accentRgb);
    } else if (cover.style === 'editorial') {
      doc.lineWidth(2).strokeColor(primaryRgb).rect(36, 36, pageW - 72, pageH - 72).stroke();
      doc.lineWidth(0.75).strokeColor(accentRgb).rect(44, 44, pageW - 88, pageH - 88).stroke();
    }

    let cursorY = 74;
    if (cover.headerText) {
      doc
        .font(serifFont)
        .fontSize(9)
        .fillColor('#6B7280')
        .text(cover.headerText.toUpperCase(), 70, cursorY, { align: 'center', width: pageW - 140 });
      cursorY += 28;
    }

    // Vector emblem or uploaded logo badge
    const logoSize = cover.logoSize === 'small' ? 42 : cover.logoSize === 'large' ? 76 : 58;
    let logoRendered = false;
    if (profile.logoType === 'upload' && profile.logoDataUrl.startsWith('data:image/png')) {
      try {
        const b64 = profile.logoDataUrl.split(',')[1];
        if (b64) {
          doc.image(Buffer.from(b64, 'base64'), (pageW - logoSize) / 2, cursorY, {
            fit: [logoSize, logoSize],
            align: 'center',
          });
          logoRendered = true;
        }
      } catch {
        logoRendered = false;
      }
    }

    if (!logoRendered) {
      const cx = pageW / 2;
      const cy = cursorY + logoSize / 2;
      doc
        .lineWidth(2)
        .strokeColor(primaryRgb)
        .roundedRect(cx - logoSize / 2, cy - logoSize / 2, logoSize, logoSize, 10)
        .stroke();
      const initials = profile.fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() || '')
        .join('');
      doc
        .font(serifBold)
        .fontSize(Math.round(logoSize * 0.36))
        .fillColor(primaryRgb)
        .text(initials || 'IT', cx - logoSize / 2, cy - logoSize * 0.2, {
          width: logoSize,
          align: 'center',
        });
    }

    cursorY += logoSize + 18;

    if (cover.fields.institucion) {
      doc
        .font(serifBold)
        .fontSize(15)
        .fillColor(primaryRgb)
        .text(profile.institution, 70, cursorY, { align: 'center', width: pageW - 140 });
      cursorY += 24;
    }

    if (cover.fields.carrera) {
      doc
        .font(serifFont)
        .fontSize(11.5)
        .fillColor('#374151')
        .text(profile.faculty, 70, cursorY, { align: 'center', width: pageW - 140 });
      cursorY += 36;
    }

    // Center hero title
    cursorY = Math.max(cursorY, 275);
    if (cover.fields.asignatura) {
      doc
        .font(serifBold)
        .fontSize(12)
        .fillColor(accentRgb)
        .text(task.subject, 75, cursorY, { align: 'center', width: pageW - 150 });
      cursorY += 24;
    }

    if (cover.fields.titulo) {
      doc
        .font(serifBold)
        .fontSize(21)
        .fillColor('#0F172A')
        .text(task.title, 75, cursorY, { align: 'center', width: pageW - 150 });
    }

    // Metadata block near bottom
    const metaRows: Array<[string, string]> = [];
    if (cover.fields.sustentante) metaRows.push(['Sustentante', profile.fullName]);
    if (cover.fields.matricula) metaRows.push(['Matrícula', profile.matricula]);
    if (cover.fields.docente) metaRows.push(['Docente', task.professor || profile.previewProfessor]);
    if (cover.fields.seccion) metaRows.push(['Sección / Código', task.sectionCode || profile.previewSection]);
    if (cover.fields.fecha) metaRows.push(['Fecha de entrega', task.dueLabel]);

    let metaY = pageH - 185 - metaRows.length * 18;
    if (metaRows.length > 0) {
      doc
        .moveTo(95, metaY - 12)
        .lineTo(pageW - 95, metaY - 12)
        .lineWidth(0.75)
        .strokeColor('#D1D5DB')
        .stroke();

      for (const [label, value] of metaRows) {
        doc.font(serifBold).fontSize(10.5).fillColor('#374151').text(`${label}:`, 95, metaY, { width: 150 });
        doc.font(serifFont).fontSize(10.5).fillColor('#111827').text(value, 250, metaY, { width: pageW - 345, align: 'right' });
        metaY += 20;
      }
    }

    const footerLine = [cover.footerText, cover.fields.paginaUno ? 'Página 1' : '']
      .filter(Boolean)
      .join('  ·  ');
    if (footerLine) {
      doc
        .font(serifFont)
        .fontSize(9)
        .fillColor('#6B7280')
        .text(footerLine, 70, pageH - 70, { align: 'center', width: pageW - 140 });
    }

    // Page 2: Índice Temático (if enabled)
    if (cover.fields.indiceTematico) {
      doc.addPage();
      doc.font(serifBold).fontSize(16).fillColor(primaryRgb).text('Índice Temático', 60, 70);
      doc.moveTo(60, 96).lineTo(pageW - 60, 96).lineWidth(1).strokeColor(accentRgb).stroke();

      let tocY = 118;
      doc.font(serifFont).fontSize(11).fillColor('#111827');
      doc.text('Resumen Ejecutivo', 60, tocY);
      doc.text('Pág. 3', pageW - 120, tocY, { width: 60, align: 'right' });
      tocY += 24;

      content.sections.forEach((sec, idx) => {
        doc.text(`${idx + 1}. ${sec.heading}`, 60, tocY, { width: pageW - 190 });
        doc.text(`Pág. ${idx + 3}`, pageW - 120, tocY, { width: 60, align: 'right' });
        tocY += 24;
      });

      doc.text('Conclusiones', 60, tocY);
      doc.text(`Pág. ${content.sections.length + 3}`, pageW - 120, tocY, { width: 60, align: 'right' });
      tocY += 24;
      doc.text('Referencias Bibliográficas', 60, tocY);
      doc.text(`Pág. ${content.sections.length + 3}`, pageW - 120, tocY, { width: 60, align: 'right' });
    }

    // Body Pages
    doc.addPage();
    doc.font(serifBold).fontSize(14).fillColor(primaryRgb).text('Resumen Ejecutivo');
    doc.moveDown(0.4);
    doc.font(serifFont).fontSize(11).fillColor('#1F2937').text(content.abstract, { align: 'justify', lineGap: 4 });
    doc.moveDown(1);

    content.sections.forEach((sec, idx) => {
      doc.font(serifBold).fontSize(13.5).fillColor(primaryRgb).text(`${idx + 1}. ${sec.heading}`);
      doc.moveDown(0.35);
      sec.paragraphs.forEach((p) => {
        doc.font(serifFont).fontSize(11).fillColor('#1F2937').text(p, { align: 'justify', lineGap: 4 });
        doc.moveDown(0.6);
      });
      doc.moveDown(0.4);
    });

    doc.font(serifBold).fontSize(13.5).fillColor(primaryRgb).text('Conclusiones');
    doc.moveDown(0.35);
    doc.font(serifFont).fontSize(11).fillColor('#1F2937').text(content.conclusion, { align: 'justify', lineGap: 4 });
    doc.moveDown(1);

    doc.font(serifBold).fontSize(13.5).fillColor(primaryRgb).text('Referencias Bibliográficas (APA)');
    doc.moveDown(0.35);
    content.references.forEach((ref) => {
      doc.font(serifFont).fontSize(10.5).fillColor('#374151').text(`• ${ref}`, { lineGap: 3 });
      doc.moveDown(0.3);
    });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  // 3) Compile DOCX via `docx`
  const docxChildren: Paragraph[] = [];
  if (cover.fields.institucion) {
    docxChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({ text: profile.institution, bold: true, size: 30 })],
      })
    );
  }
  if (cover.fields.carrera) {
    docxChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 360 },
        children: [new TextRun({ text: profile.faculty, size: 24 })],
      })
    );
  }
  if (cover.fields.asignatura) {
    docxChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 120 },
        children: [new TextRun({ text: task.subject, bold: true, size: 24 })],
      })
    );
  }
  if (cover.fields.titulo) {
    docxChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
        children: [new TextRun({ text: task.title, bold: true, size: 36 })],
      })
    );
  }
  if (cover.fields.sustentante) {
    docxChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `Sustentante: ${profile.fullName}`, size: 22 })],
      })
    );
  }
  if (cover.fields.matricula) {
    docxChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `Matrícula: ${profile.matricula}`, size: 22 })],
      })
    );
  }
  if (cover.fields.docente) {
    docxChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `Docente: ${task.professor || profile.previewProfessor}`, size: 22 })],
      })
    );
  }
  if (cover.fields.fecha) {
    docxChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [new TextRun({ text: `Fecha: ${task.dueLabel}`, size: 22 })],
      })
    );
  }

  docxChildren.push(new Paragraph({ children: [new PageBreak()] }));
  docxChildren.push(
    new Paragraph({
      text: 'Resumen Ejecutivo',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 140 },
    }),
    new Paragraph({
      text: content.abstract,
      spacing: { after: 240 },
    })
  );

  content.sections.forEach((sec, idx) => {
    docxChildren.push(
      new Paragraph({
        text: `${idx + 1}. ${sec.heading}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 120 },
      })
    );
    sec.paragraphs.forEach((p) => {
      docxChildren.push(new Paragraph({ text: p, spacing: { after: 140 } }));
    });
  });

  docxChildren.push(
    new Paragraph({
      text: 'Conclusiones',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 120 },
    }),
    new Paragraph({ text: content.conclusion, spacing: { after: 240 } }),
    new Paragraph({
      text: 'Referencias Bibliográficas',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 120 },
    }),
    ...content.references.map((r) => new Paragraph({ text: `• ${r}`, spacing: { after: 80 } }))
  );

  const wordDoc = new Document({
    sections: [{ children: docxChildren }],
  });
  const docxBuffer = await Packer.toBuffer(wordDoc);
  fs.writeFileSync(docxPath, docxBuffer);

  return { pdfFile, docxFile, htmlFile };
}

/**
 * Ensures initial seeded `PDF listo` tasks have genuine readable PDF/DOCX artifacts on disk
 * built using the active CoverConfig & StudentProfile so `Abrir PDF` works immediately.
 */
export async function ensureStarterDeliverables(
  tasks: TaskItem[],
  cover: CoverConfig,
  profile: StudentProfile,
  outputDir: string
): Promise<void> {
  for (const task of tasks) {
    if (task.status === 'PDF listo' && task.pdfFile) {
      const targetPdf = path.join(outputDir, task.pdfFile);
      if (!fs.existsSync(targetPdf)) {
        const starterContent: DraftedAcademicContent = {
          abstract:
            'El presente documento compara las arquitecturas monolíticas modulares frente a los sistemas basados en microservicios, evaluando su impacto en acoplamiento, observabilidad, despliegue continuo y costo operativo en entornos académicos y empresariales.',
          sections: [
            {
              heading: 'Fundamentos de la Arquitectura Monolítica Modular',
              paragraphs: [
                'Un monolito modular organiza el dominio en límites lógicos bien definidos dentro de una única unidad de despliegue, evitando la sobrecarga de red entre módulos internos y simplificando las transacciones ACID.',
                'Esta aproximación resulta idónea para equipos pequeños o etapas tempranas del producto donde la velocidad de iteración y la trazabilidad local son prioritarias.',
              ],
            },
            {
              heading: 'Diseño Distribuido mediante Microservicios',
              paragraphs: [
                'Los microservicios desacoplan cada capacidad de negocio en servicios independientes con su propio ciclo de despliegue y almacenamiento, habilitando el escalado selectivo y la tolerancia a fallos aislados.',
                'Sin embargo, introducen retos de consistencia eventual, latencia de serialización, descubrimiento de servicios y observabilidad distribuida.',
              ],
            },
          ],
          conclusion:
            'La selección arquitectónica debe responder al tamaño del equipo, los requisitos de escalabilidad independiente y la madurez operativa de la organización.',
          references: [
            'Newman, S. (2021). Building Microservices (2nd ed.). O’Reilly Media.',
            'Richards, M., & Ford, N. (2020). Fundamentals of Software Architecture. O’Reilly Media.',
            'Fowler, M. (2015). MonolithFirst. martinfowler.com.',
          ],
        };
        const generated = await generateDeliverables(task, cover, profile, outputDir, starterContent);
        // Align filenames with starter task record if needed
        const genPdf = path.join(outputDir, generated.pdfFile);
        if (generated.pdfFile !== task.pdfFile && fs.existsSync(genPdf)) {
          fs.renameSync(genPdf, targetPdf);
        }
        if (task.docxFile) {
          const genDocx = path.join(outputDir, generated.docxFile);
          const targetDocx = path.join(outputDir, task.docxFile);
          if (generated.docxFile !== task.docxFile && fs.existsSync(genDocx)) {
            fs.renameSync(genDocx, targetDocx);
          }
        }
      }
    }
  }
}
