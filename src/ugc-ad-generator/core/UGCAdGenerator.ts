/**
 * UGC Ad Generator - メインクラス
 *
 * すべてのコンポーネントを統合してUGC広告動画を生成
 */

import type {
  UGCAdGeneratorConfig,
  UGCAdGenerationRequest,
  UGCAdGenerationResult,
  GeneratedAd,
  FailedAd,
  UGCStyle,
  AspectRatio,
} from '../types';
import { Sora2APIClient } from '../api/sora2-client';
import { VideoValidator } from '../validators/video-validator';
import { ContentPolicyChecker } from '../policy/content-policy-checker';
import { QualityScorer } from '../quality/quality-scorer';
import { buildVariedPrompt } from '../prompts/ugc-templates';
import { logger } from '../utils/logger';
import { CostTracker, SORA2_PRICING } from '../utils/cost-tracker';

/**
 * UGC Ad Generatorクラス
 */
export class UGCAdGenerator {
  private apiClient: Sora2APIClient;
  private validator: VideoValidator;
  private policyChecker: ContentPolicyChecker;
  private qualityScorer: QualityScorer;
  private costTracker: CostTracker;
  private config: UGCAdGeneratorConfig;

  constructor(config: UGCAdGeneratorConfig) {
    this.config = config;
    this.apiClient = new Sora2APIClient(config.apiKey, config.retryConfig);
    this.validator = new VideoValidator();
    this.policyChecker = new ContentPolicyChecker(config.apiKey);
    this.qualityScorer = new QualityScorer();
    this.costTracker = new CostTracker();

    logger.info('UGCAdGenerator初期化完了', {
      outputDir: config.outputDir,
      defaultResolution: config.defaultResolution,
    });
  }

  /**
   * UGC広告動画生成
   *
   * @param request - 生成リクエスト
   * @returns 生成結果
   */
  async generate(
    request: UGCAdGenerationRequest
  ): Promise<UGCAdGenerationResult> {
    const startTime = Date.now();

    logger.info('🎬 UGC広告生成開始', {
      sourceVideo: request.sourceVideo,
      numberOfAds: request.numberOfAds,
    });

    // 1. 入力検証
    logger.info('📋 ステップ 1/6: 入力検証');
    const validationResult = await this.validator.validate(request.sourceVideo);
    if (!validationResult.isValid) {
      throw new Error(`入力検証失敗: ${validationResult.errors.join(', ')}`);
    }
    logger.info('✅ 入力検証成功');

    // 2. コンテンツポリシーチェック
    logger.info('🛡️  ステップ 2/6: コンテンツポリシーチェック');
    const policyCheckResult = await this.policyChecker.check(request.sourceVideo);
    if (!policyCheckResult.isCompliant) {
      throw new Error(
        `コンテンツポリシー違反: ${policyCheckResult.details.join(', ')}`
      );
    }
    logger.info('✅ コンテンツポリシーチェック成功');

    // 3. バリエーション戦略生成
    logger.info('🎨 ステップ 3/6: バリエーション戦略生成');
    const generationPlan = this.createGenerationPlan(request);
    logger.info(`✅ ${generationPlan.length}本の生成プラン作成完了`);

    // 4. Sora2 API生成リクエスト
    logger.info('🚀 ステップ 4/6: Sora2 API生成リクエスト');
    const sora2Responses = await this.apiClient.generateBatch(
      generationPlan.map((plan) => ({
        prompt: plan.prompt,
        duration: request.duration || 10,
        aspectRatio: plan.aspectRatio,
        resolution: this.config.defaultResolution || '1080p',
        fps: this.config.defaultFps || 30,
      })),
      3 // 並列数
    );

    // 5. 品質スコアリング
    logger.info('📊 ステップ 5/6: 品質スコアリング');
    const generatedAds: GeneratedAd[] = [];
    const failedAds: FailedAd[] = [];

    for (const [index, response] of sora2Responses.entries()) {
      const plan = generationPlan[index];

      if (response.status === 'failed' || !response.videoUrl) {
        failedAds.push({
          id: `ad-${String(index + 1).padStart(3, '0')}`,
          error: response.error || '生成失敗',
          errorCode: 'GenerationFailed',
          prompt: plan.prompt,
        });
        continue;
      }

      // 品質スコアリング（モック: 実際はダウンロードした動画を評価）
      const qualityScore = await this.qualityScorer.score(response.videoUrl);

      if (qualityScore.overall < 70) {
        failedAds.push({
          id: `ad-${String(index + 1).padStart(3, '0')}`,
          error: `品質スコア不足: ${qualityScore.overall}点 (最低70点必要)`,
          errorCode: 'QualityTooLow',
          prompt: plan.prompt,
        });
        continue;
      }

      // コスト記録
      const cost = this.costTracker.calculateVideoCost(
        request.duration || 10,
        this.config.defaultResolution || '1080p'
      );
      this.costTracker.recordCost(cost, `Ad ${index + 1} generated`);

      generatedAds.push({
        id: `ad-${String(index + 1).padStart(3, '0')}`,
        videoUrl: response.videoUrl,
        thumbnailUrl: response.thumbnailUrl || '',
        duration: request.duration || 10,
        aspectRatio: plan.aspectRatio,
        ugcStyle: plan.ugcStyle,
        prompt: plan.prompt,
        qualityScore: qualityScore.overall,
        metadata: {
          filename: `ad-${String(index + 1).padStart(3, '0')}-${plan.ugcStyle}-${plan.aspectRatio.replace(':', 'x')}.mp4`,
          resolution: this.config.defaultResolution || '1080p',
          fileSize: 12000000, // モック値
          ugcAuthenticityScore: qualityScore.ugcAuthenticity,
          adEffectivenessScore: qualityScore.adEffectiveness,
          generationTime: 90, // モック値
          cost,
        },
      });
    }

    // 6. 結果返却
    const totalDuration = (Date.now() - startTime) / 1000;
    const totalCost = this.costTracker.getTotalCost();

    logger.info('✅ UGC広告生成完了', {
      generated: generatedAds.length,
      failed: failedAds.length,
      totalDuration: `${totalDuration.toFixed(1)}秒`,
      totalCost: `$${totalCost.toFixed(2)}`,
    });

    return {
      generatedAds,
      failedAds,
      totalDuration,
      totalCost,
    };
  }

  /**
   * バリエーション戦略生成
   */
  private createGenerationPlan(request: UGCAdGenerationRequest): Array<{
    ugcStyle: UGCStyle;
    aspectRatio: AspectRatio;
    prompt: string;
  }> {
    const plan: Array<{
      ugcStyle: UGCStyle;
      aspectRatio: AspectRatio;
      prompt: string;
    }> = [];

    const allStyles: UGCStyle[] = request.ugcStyle || [
      'casual',
      'testimonial',
      'tutorial',
      'unboxing',
      'lifestyle',
      'comparison',
    ];
    const aspectRatios = request.targetAspectRatio;

    // スタイルとアスペクト比を均等に分散
    for (let i = 0; i < request.numberOfAds; i++) {
      const style = allStyles[i % allStyles.length];
      const aspectRatio = aspectRatios[i % aspectRatios.length];

      const prompt = buildVariedPrompt(style, 'product', {
        framing: aspectRatio,
        tone: i % 2 === 0 ? 'energetic' : 'friendly',
        pacing: i < request.numberOfAds / 2 ? 'medium' : 'short',
        additionalPrompts: request.additionalPrompts,
      });

      plan.push({ ugcStyle: style, aspectRatio, prompt });
    }

    return plan;
  }

  /**
   * コストサマリー取得
   */
  getCostSummary() {
    return this.costTracker.getSummary();
  }
}
