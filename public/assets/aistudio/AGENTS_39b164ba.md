# AGENTS.md - Asistente Local de Tareas (ITLAVIRTUAL / Moodle)

## Objetivo
Bot local en Python que se ejecuta bajo demanda, revisa las tareas pendientes en Moodle (`aulavirtual.itla.edu.do`), prioriza por fecha de entrega más cercana, clasifica las actividades, notifica por Telegram si requieren fotos (manual) o si fueron completadas, y usa la API de Gemini para redactar trabajos de investigación en PDF/DOCX dentro de `Tareas pendientes/` para revisión humana.

## Stack obligatorio
- Python 3.11+
- Scraping/Auth: Playwright (con `storage_state` en `session.json`) + BeautifulSoup4 (`lxml`)
- Base de datos: `sqlite3` (archivo local `data/tasks.db`)
- IA: SDK oficial moderno `google-genai` (`from google import genai`), modelo `gemini-4-hydrogen`
- Documentos: WeasyPrint (HTML -> PDF) + `python-docx` (.docx editable)
- Notificaciones: `httpx` contra Telegram Bot API
- Config y tests: `python-dotenv`, `pytest`

## Reglas estrictas
1. Credenciales y tokens SIEMPRE en `.env` (`MOODLE_USER`, `MOODLE_PASS`, `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`). Nunca hardcodear secretos.
2. Filtrado estricto de URLs: solo procesar actividades de tipo `/mod/assign/view.php`. Ignorar `/mod/quiz/`, `/mod/forum/`, `/mod/url/`, `/mod/resource/`.
3. No procesar tareas cuyo estado de entrega ya sea `"Enviado para calificar"`.
4. Trabajar por fases aisladas. No implementar código de fases futuras sin indicación explícita.
5. Todo parser debe tener pruebas unitarias en `tests/` usando los HTML reales en `tests/fixtures/`.

## Estructura del proyecto
- `main.py`: CLI (`--once`, `--watch`, `--dry-run`, `--login`, `--test-telegram`, `--test-pdf`)
- `config.py`: Variables de entorno y rutas
- `scraper/`: `auth.py`, `parser.py`
- `core/`: `database.py`, `classifier.py`, `pipeline.py`
- `notifications/`: `telegram.py`
- `generator/`: `gemini_solver.py`, `document_builder.py`, `templates/academic.html`
- `Tareas pendientes/`: Salida de PDF y DOCX listos para revisión
- `tests/fixtures/`: HTMLs guardados offline (`calendario_upcoming.html`, `tarea_detalle.html`)