/**
 * UGC Ad Generator - ロガーユーティリティ
 *
 * タイムスタンプ付きログ出力、レベル別ログ管理
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private name: string;
  private level: LogLevel;

  constructor(name: string, level: LogLevel = LogLevel.INFO) {
    this.name = name;
    this.level = level;
  }

  /**
   * タイムスタンプ生成
   */
  private timestamp(): string {
    return new Date().toISOString();
  }

  /**
   * ログフォーマット
   */
  private format(level: string, message: string, meta?: Record<string, unknown>): string {
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${this.timestamp()}] [${this.name}] ${level}: ${message}${metaStr}`;
  }

  /**
   * DEBUGログ
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(this.format('DEBUG', message, meta));
    }
  }

  /**
   * INFOログ
   */
  info(message: string, meta?: Record<string, unknown>): void {
    if (this.level <= LogLevel.INFO) {
      console.info(this.format('INFO', message, meta));
    }
  }

  /**
   * WARNログ
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.format('WARN', message, meta));
    }
  }

  /**
   * ERRORログ
   */
  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    if (this.level <= LogLevel.ERROR) {
      const errorMeta = error instanceof Error
        ? { error: error.message, stack: error.stack, ...meta }
        : { error, ...meta };
      console.error(this.format('ERROR', message, errorMeta));
    }
  }

  /**
   * 生成進行状況ログ
   */
  progress(current: number, total: number, message: string): void {
    this.info(`[${current}/${total}] ${message}`);
  }

  /**
   * セパレーター出力
   */
  separator(): void {
    console.log('---');
  }
}

/**
 * デフォルトロガーインスタンス
 */
export const logger = new Logger('UGCAdGenerator');
