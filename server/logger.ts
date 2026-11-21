import { EventEmitter } from 'node:events';
import type { LogEntry, LogLevel } from '../src/types/botchase.ts';

class BotLogger extends EventEmitter {
  private entries: LogEntry[] = [];
  private readonly maxEntries = 400;

  constructor() {
    super();
    this.setMaxListeners(50);
  }

  public log(level: LogLevel, source: string, message: string): LogEntry {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');

    const entry: LogEntry = {
      id: `${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: `${hh}:${mm}:${ss}.${ms}`,
      level,
      source,
      message,
    };

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(this.entries.length - this.maxEntries);
    }

    this.emit('entry', entry);
    return entry;
  }

  public info(source: string, message: string): LogEntry {
    return this.log('INFO', source, message);
  }

  public warn(source: string, message: string): LogEntry {
    return this.log('WARNING', source, message);
  }

  public error(source: string, message: string): LogEntry {
    return this.log('ERROR', source, message);
  }

  public getAll(): LogEntry[] {
    return [...this.entries];
  }

  public clear(): void {
    this.entries = [];
    this.emit('cleared');
  }
}

export const botLogger = new BotLogger();
