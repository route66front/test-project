/**
 * Sora2 APIクライアント
 *
 * OpenAI Sora2 APIとの統合、レート制限管理、ポーリング監視
 */

import type {
  Sora2GenerationRequest,
  Sora2GenerationResponse,
  RetryConfig,
} from '../types';
import { withRetry, defaultRetryConfig } from '../utils/retry';
import { logger } from '../utils/logger';
import { sleep } from '../utils/retry';

/**
 * Sora2 APIレート制限設定
 */
const RATE_LIMIT = {
  requestsPerMinute: 3,
  pollingInterval: 10000, // 10秒
  generationTimeout: 300000, // 5分
} as const;

/**
 * Sora2 APIクライアントクラス
 */
export class Sora2APIClient {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  private retryConfig: RetryConfig;
  private requestTimestamps: number[] = [];

  constructor(apiKey: string, retryConfig?: RetryConfig) {
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY が設定されていません');
    }
    this.apiKey = apiKey;
    this.retryConfig = retryConfig || defaultRetryConfig;
  }

  /**
   * レート制限チェック
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // 1分以内のリクエストをフィルタ
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => timestamp > oneMinuteAgo
    );

    if (this.requestTimestamps.length >= RATE_LIMIT.requestsPerMinute) {
      const oldestRequest = this.requestTimestamps[0];
      const waitTime = 60000 - (now - oldestRequest);

      if (waitTime > 0) {
        logger.warn(
          `レート制限: ${waitTime}ms待機します`,
          { currentRequests: this.requestTimestamps.length }
        );
        await sleep(waitTime);
      }
    }

    this.requestTimestamps.push(now);
  }

  /**
   * Sora2 API動画生成リクエスト
   *
   * @param request - 生成リクエスト
   * @returns ジョブID
   */
  async generateVideo(
    request: Sora2GenerationRequest
  ): Promise<string> {
    await this.waitForRateLimit();

    logger.info('Sora2 API: 動画生成リクエスト送信', {
      duration: request.duration,
      aspectRatio: request.aspectRatio,
      resolution: request.resolution,
    });

    const response = (await withRetry(
      async () => {
        const res = await fetch(`${this.baseUrl}/video/generations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: 'sora-2',
            prompt: request.prompt,
            duration: request.duration,
            aspect_ratio: request.aspectRatio,
            resolution: request.resolution,
            fps: request.fps,
            ...(request.sourceVideoUrl && {
              source_video_url: request.sourceVideoUrl,
            }),
          }),
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({ error: res.statusText }));
          if (res.status === 429) {
            throw new Error('RateLimitExceeded');
          }
          if (res.status === 408 || res.status === 504) {
            throw new Error('APITimeout');
          }
          throw new Error(`Sora2 API Error: ${JSON.stringify(error)}`);
        }

        return res.json();
      },
      this.retryConfig,
      'Sora2 API generateVideo'
    )) as { id?: string; job_id?: string };

    const jobId = response.id || response.job_id;
    if (!jobId) {
      throw new Error('Sora2 API: ジョブIDが取得できませんでした');
    }
    logger.info(`Sora2 API: ジョブID取得 ${jobId}`);

    return jobId;
  }

  /**
   * ジョブステータスをポーリングで監視
   *
   * @param jobId - ジョブID
   * @returns 生成結果
   */
  async pollJobStatus(
    jobId: string
  ): Promise<Sora2GenerationResponse> {
    const startTime = Date.now();
    let progress = 0;

    logger.info(`Sora2 API: ジョブ監視開始 ${jobId}`);

    while (true) {
      const elapsed = Date.now() - startTime;

      if (elapsed > RATE_LIMIT.generationTimeout) {
        throw new Error(`APITimeout: ジョブ ${jobId} がタイムアウトしました`);
      }

      const status = await this.getJobStatus(jobId);

      // 進行状況ログ
      if (status.progress !== undefined && status.progress > progress) {
        progress = status.progress;
        logger.info(`Sora2 API: 進行状況 ${progress}%`, { jobId });
      }

      if (status.status === 'completed') {
        logger.info(`Sora2 API: 生成完了 ${jobId}`);
        return status;
      }

      if (status.status === 'failed') {
        throw new Error(`GenerationFailed: ${status.error || '不明なエラー'}`);
      }

      // ポーリング待機
      await sleep(RATE_LIMIT.pollingInterval);
    }
  }

  /**
   * ジョブステータス取得
   *
   * @param jobId - ジョブID
   * @returns ステータス情報
   */
  private async getJobStatus(
    jobId: string
  ): Promise<Sora2GenerationResponse> {
    const res = await fetch(`${this.baseUrl}/video/generations/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to get job status: ${res.statusText}`);
    }

    const data = (await res.json()) as {
      status: 'queued' | 'processing' | 'completed' | 'failed';
      video_url?: string;
      thumbnail_url?: string;
      error?: string;
      progress?: number;
    };

    return {
      jobId,
      status: data.status,
      videoUrl: data.video_url,
      thumbnailUrl: data.thumbnail_url,
      error: data.error,
      progress: data.progress,
    };
  }

  /**
   * 動画生成のフルフロー実行
   *
   * @param request - 生成リクエスト
   * @returns 生成結果（動画URL等）
   */
  async generate(
    request: Sora2GenerationRequest
  ): Promise<Sora2GenerationResponse> {
    const jobId = await this.generateVideo(request);
    const result = await this.pollJobStatus(jobId);
    return result;
  }

  /**
   * 複数動画の並列生成（レート制限考慮）
   *
   * @param requests - 生成リクエスト配列
   * @param concurrency - 並列数（デフォルト: 3）
   * @returns 生成結果配列
   */
  async generateBatch(
    requests: Sora2GenerationRequest[],
    concurrency: number = 3
  ): Promise<Sora2GenerationResponse[]> {
    const results: Sora2GenerationResponse[] = [];
    const batches: Sora2GenerationRequest[][] = [];

    // バッチに分割
    for (let i = 0; i < requests.length; i += concurrency) {
      batches.push(requests.slice(i, i + concurrency));
    }

    logger.info(
      `Sora2 API: バッチ生成開始 (${requests.length}本、並列数: ${concurrency})`
    );

    for (const [index, batch] of batches.entries()) {
      logger.info(`バッチ ${index + 1}/${batches.length} 実行中`);

      const batchResults = await Promise.all(
        batch.map((request) => this.generate(request))
      );

      results.push(...batchResults);
    }

    logger.info(`Sora2 API: バッチ生成完了 (${results.length}本)`);

    return results;
  }
}
