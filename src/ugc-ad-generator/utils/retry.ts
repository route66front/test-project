/**
 * UGC Ad Generator - リトライユーティリティ
 *
 * 指数バックオフによる自動リトライロジック
 */

import type { RetryConfig } from '../types';
import { logger } from './logger';

/**
 * デフォルトリトライ設定
 */
export const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  initialDelay: 30000, // 30秒
  maxDelay: 300000, // 5分
  backoffMultiplier: 2,
  retryableErrors: [
    'RateLimitExceeded',
    'APITimeout',
    'GenerationFailed',
    'NetworkError',
  ],
};

/**
 * リトライ可能なエラーかチェック
 */
export function isRetryableError(
  error: Error | unknown,
  retryableErrors: string[]
): boolean {
  if (error instanceof Error) {
    return retryableErrors.some((retryableError) =>
      error.message.includes(retryableError) || error.name === retryableError
    );
  }
  return false;
}

/**
 * 指数バックオフ遅延計算
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig
): number {
  const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelay);
}

/**
 * 遅延実行
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * リトライ実行ラッパー
 *
 * @param fn - 実行する非同期関数
 * @param config - リトライ設定
 * @param context - ログ用コンテキスト
 * @returns 実行結果
 * @throws 最大リトライ回数超過時にエラー
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = defaultRetryConfig,
  context: string = 'operation'
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = calculateBackoffDelay(attempt - 1, config);
        logger.info(
          `${context}: リトライ ${attempt}/${config.maxRetries}回目 (${delay}ms後)`,
          { attempt, delay }
        );
        await sleep(delay);
      }

      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error, config.retryableErrors)) {
        logger.error(`${context}: リトライ不可能なエラー`, error);
        throw error;
      }

      if (attempt === config.maxRetries) {
        logger.error(
          `${context}: 最大リトライ回数(${config.maxRetries})到達`,
          error
        );
        break;
      }

      logger.warn(
        `${context}: エラー発生、リトライします`,
        error instanceof Error ? { error: error.message } : { error }
      );
    }
  }

  throw new Error(
    `${context}: ${config.maxRetries}回のリトライ後も失敗: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

/**
 * バッチリトライ実行
 *
 * 複数のタスクを並列実行し、失敗したものだけリトライ
 *
 * @param tasks - 実行するタスク配列
 * @param config - リトライ設定
 * @returns 成功したタスクと失敗したタスク
 */
export async function withBatchRetry<T>(
  tasks: Array<() => Promise<T>>,
  config: RetryConfig = defaultRetryConfig
): Promise<{
  successful: T[];
  failed: Array<{ index: number; error: Error | unknown }>;
}> {
  const results = await Promise.allSettled(
    tasks.map((task, index) =>
      withRetry(task, config, `Task ${index + 1}`)
    )
  );

  const successful: T[] = [];
  const failed: Array<{ index: number; error: Error | unknown }> = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successful.push(result.value);
    } else {
      failed.push({ index, error: result.reason });
    }
  });

  return { successful, failed };
}
