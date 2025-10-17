/**
 * UGC Ad Generator - 型定義
 */

/**
 * アスペクト比の型
 */
export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

/**
 * UGCスタイルの型
 */
export type UGCStyle =
  | 'casual'      // カジュアルなユーザー撮影風
  | 'testimonial' // 証言・レビュー風
  | 'tutorial'    // チュートリアル・ハウツー風
  | 'unboxing'    // 開封・使用感レビュー風
  | 'lifestyle'   // ライフスタイル提案風
  | 'comparison'; // ビフォーアフター比較風

/**
 * UGC広告生成リクエスト
 */
export interface UGCAdGenerationRequest {
  /** 元動画パス */
  sourceVideo: string;

  /** 生成本数 (1-10) */
  numberOfAds: number;

  /** アスペクト比指定 */
  targetAspectRatio: AspectRatio[];

  /** スタイル指定（未指定時は自動選択） */
  ugcStyle?: UGCStyle[];

  /** 各広告の長さ（秒） */
  duration?: number;

  /** 追加プロンプト */
  additionalPrompts?: string[];
}

/**
 * UGC広告生成結果
 */
export interface UGCAdGenerationResult {
  /** 生成された広告 */
  generatedAds: GeneratedAd[];

  /** 失敗した広告 */
  failedAds: FailedAd[];

  /** 総実行時間（秒） */
  totalDuration: number;

  /** 総コスト（ドル） */
  totalCost: number;
}

/**
 * 生成された広告
 */
export interface GeneratedAd {
  /** 広告ID */
  id: string;

  /** 動画URL */
  videoUrl: string;

  /** サムネイルURL */
  thumbnailUrl: string;

  /** 動画の長さ（秒） */
  duration: number;

  /** アスペクト比 */
  aspectRatio: string;

  /** UGCスタイル */
  ugcStyle: string;

  /** 使用したプロンプト */
  prompt: string;

  /** メタデータ */
  metadata: VideoMetadata;

  /** 品質スコア (0-100) */
  qualityScore: number;
}

/**
 * 失敗した広告
 */
export interface FailedAd {
  /** 広告ID */
  id: string;

  /** エラー理由 */
  error: string;

  /** エラーコード */
  errorCode: string;

  /** 使用したプロンプト */
  prompt?: string;
}

/**
 * 動画メタデータ
 */
export interface VideoMetadata {
  /** ファイル名 */
  filename: string;

  /** 解像度 */
  resolution: string;

  /** ファイルサイズ（バイト） */
  fileSize: number;

  /** UGC自然さスコア (0-100) */
  ugcAuthenticityScore: number;

  /** 広告効果スコア (0-100) */
  adEffectivenessScore: number;

  /** 生成時間（秒） */
  generationTime: number;

  /** コスト（ドル） */
  cost: number;
}

/**
 * 動画入力検証結果
 */
export interface VideoValidationResult {
  /** 検証が成功したか */
  isValid: boolean;

  /** エラーメッセージ */
  errors: string[];

  /** 動画情報 */
  videoInfo?: {
    duration: number;
    resolution: string;
    fileSize: number;
    format: string;
    fps: number;
  };
}

/**
 * コンテンツポリシーチェック結果
 */
export interface ContentPolicyCheckResult {
  /** ポリシーに準拠しているか */
  isCompliant: boolean;

  /** 実在人物が含まれているか */
  hasRealPersons: boolean;

  /** 著作権保護されたキャラクターが含まれているか */
  hasCopyrightedCharacters: boolean;

  /** 不適切なコンテンツが含まれているか */
  hasInappropriateContent: boolean;

  /** ブランドロゴが含まれているか */
  hasBrandLogos: boolean;

  /** リスクレベル */
  riskLevel: 'safe' | 'medium' | 'high';

  /** 詳細メッセージ */
  details: string[];
}

/**
 * 品質スコアリング結果
 */
export interface QualityScore {
  /** 総合品質スコア (0-100) */
  overall: number;

  /** 動画品質スコア (0-100) */
  videoQuality: number;

  /** UGC自然さスコア (0-100) */
  ugcAuthenticity: number;

  /** 広告効果スコア (0-100) */
  adEffectiveness: number;

  /** 減点項目 */
  deductions: {
    reason: string;
    points: number;
  }[];
}

/**
 * Sora2 API生成リクエスト
 */
export interface Sora2GenerationRequest {
  /** プロンプト */
  prompt: string;

  /** 動画の長さ（秒） */
  duration: number;

  /** アスペクト比 */
  aspectRatio: AspectRatio;

  /** 解像度 */
  resolution: '720p' | '1080p';

  /** FPS */
  fps: 24 | 30 | 60;

  /** 元動画URL（オプション） */
  sourceVideoUrl?: string;
}

/**
 * Sora2 API生成レスポンス
 */
export interface Sora2GenerationResponse {
  /** ジョブID */
  jobId: string;

  /** ステータス */
  status: 'queued' | 'processing' | 'completed' | 'failed';

  /** 動画URL */
  videoUrl?: string;

  /** サムネイルURL */
  thumbnailUrl?: string;

  /** エラーメッセージ */
  error?: string;

  /** 進行状況 (0-100) */
  progress?: number;
}

/**
 * セッションメタデータ
 */
export interface SessionMetadata {
  /** セッションID */
  sessionId: string;

  /** タイムスタンプ */
  timestamp: string;

  /** 元動画情報 */
  sourceVideo: {
    filename: string;
    duration: number;
    resolution: string;
    fileSize: number;
  };

  /** 生成された広告 */
  generatedAds: GeneratedAd[];

  /** サマリー */
  summary: {
    totalGenerated: number;
    totalFailed: number;
    averageQuality: number;
    totalCost: number;
    totalDuration: number;
  };
}

/**
 * UGC広告生成エラー
 */
export enum UGCGenerationError {
  // 入力エラー
  INVALID_VIDEO_FORMAT = 'InvalidVideoFormat',
  VIDEO_TOO_LONG = 'VideoTooLong',
  FILE_TOO_LARGE = 'FileTooLarge',

  // API エラー
  RATE_LIMIT_EXCEEDED = 'RateLimitExceeded',
  API_TIMEOUT = 'APITimeout',
  CONTENT_POLICY_VIOLATION = 'ContentPolicyViolation',
  API_KEY_NOT_CONFIGURED = 'APIKeyNotConfigured',

  // 品質エラー
  QUALITY_TOO_LOW = 'QualityTooLow',
  GENERATION_FAILED = 'GenerationFailed',
}

/**
 * リトライ設定
 */
export interface RetryConfig {
  /** 最大リトライ回数 */
  maxRetries: number;

  /** 初期遅延（ミリ秒） */
  initialDelay: number;

  /** 最大遅延（ミリ秒） */
  maxDelay: number;

  /** バックオフ乗数 */
  backoffMultiplier: number;

  /** リトライ可能なエラー */
  retryableErrors: string[];
}

/**
 * UGCAdGenerator設定
 */
export interface UGCAdGeneratorConfig {
  /** OpenAI APIキー */
  apiKey: string;

  /** 出力ディレクトリ */
  outputDir: string;

  /** リトライ設定 */
  retryConfig?: RetryConfig;

  /** デフォルトの解像度 */
  defaultResolution?: '720p' | '1080p';

  /** デフォルトのFPS */
  defaultFps?: 24 | 30 | 60;

  /** デバッグモード */
  debug?: boolean;
}
