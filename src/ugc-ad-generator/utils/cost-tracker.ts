/**
 * UGC Ad Generator - コスト追跡ユーティリティ
 *
 * Sora2 API利用コストの追跡と予算管理
 */

import { logger } from './logger';

/**
 * コスト計算設定（2025年10月時点の推定値）
 */
export const SORA2_PRICING = {
  perSecond: {
    '720p': 0.5, // ドル/秒
    '1080p': 1.0, // ドル/秒
  },
  minimumCharge: 5.0, // 最小課金額
  monthlyBudget: 5000, // 月間予算上限（ドル）
} as const;

/**
 * コスト追跡クラス
 */
export class CostTracker {
  private totalCost = 0;
  private monthlyBudget: number;
  private costs: Array<{
    timestamp: Date;
    amount: number;
    description: string;
  }> = [];

  constructor(monthlyBudget: number = SORA2_PRICING.monthlyBudget) {
    this.monthlyBudget = monthlyBudget;
  }

  /**
   * 動画生成コスト計算
   *
   * @param duration - 動画の長さ（秒）
   * @param resolution - 解像度
   * @returns コスト（ドル）
   */
  calculateVideoCost(
    duration: number,
    resolution: '720p' | '1080p'
  ): number {
    const perSecondCost = SORA2_PRICING.perSecond[resolution];
    const calculatedCost = duration * perSecondCost;

    // 最小課金額を適用
    return Math.max(calculatedCost, SORA2_PRICING.minimumCharge);
  }

  /**
   * コストを記録
   *
   * @param amount - コスト額（ドル）
   * @param description - 説明
   */
  recordCost(amount: number, description: string): void {
    this.totalCost += amount;
    this.costs.push({
      timestamp: new Date(),
      amount,
      description,
    });

    logger.info(`コスト記録: $${amount.toFixed(2)} - ${description}`);

    // 予算警告
    const usagePercent = (this.totalCost / this.monthlyBudget) * 100;
    if (usagePercent >= 90) {
      logger.warn(
        `⚠️  月間予算の${usagePercent.toFixed(1)}%を使用しています`,
        {
          totalCost: this.totalCost,
          monthlyBudget: this.monthlyBudget,
        }
      );
    }
  }

  /**
   * 総コスト取得
   */
  getTotalCost(): number {
    return this.totalCost;
  }

  /**
   * 残予算取得
   */
  getRemainingBudget(): number {
    return Math.max(0, this.monthlyBudget - this.totalCost);
  }

  /**
   * 予算超過チェック
   */
  isOverBudget(): boolean {
    return this.totalCost >= this.monthlyBudget;
  }

  /**
   * 予算内で生成可能な動画数推定
   *
   * @param duration - 1動画あたりの長さ（秒）
   * @param resolution - 解像度
   * @returns 生成可能な動画数
   */
  estimateRemainingVideos(
    duration: number,
    resolution: '720p' | '1080p'
  ): number {
    const costPerVideo = this.calculateVideoCost(duration, resolution);
    const remaining = this.getRemainingBudget();
    return Math.floor(remaining / costPerVideo);
  }

  /**
   * コストサマリー取得
   */
  getSummary(): {
    totalCost: number;
    monthlyBudget: number;
    remainingBudget: number;
    usagePercent: number;
    transactionCount: number;
  } {
    return {
      totalCost: this.totalCost,
      monthlyBudget: this.monthlyBudget,
      remainingBudget: this.getRemainingBudget(),
      usagePercent: (this.totalCost / this.monthlyBudget) * 100,
      transactionCount: this.costs.length,
    };
  }

  /**
   * コスト履歴取得
   */
  getCostHistory(): Array<{
    timestamp: Date;
    amount: number;
    description: string;
  }> {
    return [...this.costs];
  }

  /**
   * リセット（テスト用）
   */
  reset(): void {
    this.totalCost = 0;
    this.costs = [];
  }
}

/**
 * デフォルトコストトラッカーインスタンス
 */
export const costTracker = new CostTracker();
