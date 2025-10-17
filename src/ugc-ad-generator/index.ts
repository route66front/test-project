/**
 * UGC Ad Generator - エントリポイント
 *
 * すべてのエクスポートを集約
 */

// メインクラス
export { UGCAdGenerator } from './core/UGCAdGenerator';

// API
export { Sora2APIClient } from './api/sora2-client';

// バリデーター
export { VideoValidator } from './validators/video-validator';

// ポリシーチェッカー
export { ContentPolicyChecker } from './policy/content-policy-checker';

// 品質スコアリング
export { QualityScorer } from './quality/quality-scorer';

// プロンプトテンプレート
export {
  ugcPromptTemplates,
  buildPrompt,
  buildVariedPrompt,
  buildBatchPrompts,
  buildRandomVariedPrompt,
} from './prompts/ugc-templates';

// ユーティリティ
export { Logger, LogLevel, logger } from './utils/logger';
export {
  withRetry,
  withBatchRetry,
  defaultRetryConfig,
  isRetryableError,
  calculateBackoffDelay,
  sleep,
} from './utils/retry';
export { CostTracker, costTracker, SORA2_PRICING } from './utils/cost-tracker';

// 型定義
export * from './types';
