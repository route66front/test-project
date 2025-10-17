/**
 * 動画バリデーター
 *
 * 入力動画の形式・サイズ・解像度・時間を検証
 */

import type { VideoValidationResult } from '../types';
import { logger } from '../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import { stat } from 'fs/promises';

const execAsync = promisify(exec);

/**
 * 動画検証設定
 */
const VALIDATION_CONFIG = {
  maxDuration: 20, // 秒
  supportedFormats: ['mp4', 'mov', 'webm'],
  maxFileSize: 500 * 1024 * 1024, // 500MB
  minResolution: { width: 1280, height: 720 }, // 720p
} as const;

/**
 * 動画バリデータークラス
 */
export class VideoValidator {
  /**
   * 動画を検証
   *
   * @param filePath - 動画ファイルパス
   * @returns 検証結果
   */
  async validate(filePath: string): Promise<VideoValidationResult> {
    const errors: string[] = [];

    logger.info(`動画検証開始: ${filePath}`);

    try {
      // ファイル存在チェック
      const stats = await stat(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);

      // ファイルサイズチェック
      if (stats.size > VALIDATION_CONFIG.maxFileSize) {
        errors.push(
          `ファイルサイズが大きすぎます: ${fileSizeMB.toFixed(2)}MB (上限: 500MB)`
        );
      }

      // 拡張子チェック
      const extension = filePath.split('.').pop()?.toLowerCase();
      if (!extension || !VALIDATION_CONFIG.supportedFormats.includes(extension as 'mp4' | 'mov' | 'webm')) {
        errors.push(
          `サポートされていないフォーマット: ${extension} (サポート: ${VALIDATION_CONFIG.supportedFormats.join(', ')})`
        );
      }

      // ffprobeで動画情報取得
      const videoInfo = await this.getVideoInfo(filePath);

      if (!videoInfo) {
        errors.push('動画情報の取得に失敗しました');
        return { isValid: false, errors };
      }

      // 時間チェック
      if (videoInfo.duration > VALIDATION_CONFIG.maxDuration) {
        errors.push(
          `動画が長すぎます: ${videoInfo.duration}秒 (上限: ${VALIDATION_CONFIG.maxDuration}秒)`
        );
      }

      // 解像度チェック
      const [width, height] = videoInfo.resolution.split('x').map(Number);
      if (
        width < VALIDATION_CONFIG.minResolution.width ||
        height < VALIDATION_CONFIG.minResolution.height
      ) {
        errors.push(
          `解像度が低すぎます: ${videoInfo.resolution} (最小: 1280x720)`
        );
      }

      const isValid = errors.length === 0;

      if (isValid) {
        logger.info('動画検証成功', videoInfo);
      } else {
        logger.warn('動画検証失敗', { errors });
      }

      return {
        isValid,
        errors,
        videoInfo: isValid ? videoInfo : undefined,
      };
    } catch (error) {
      errors.push(`検証エラー: ${error instanceof Error ? error.message : String(error)}`);
      logger.error('動画検証エラー', error);
      return { isValid: false, errors };
    }
  }

  /**
   * ffprobeで動画情報取得
   */
  private async getVideoInfo(
    filePath: string
  ): Promise<
    | {
        duration: number;
        resolution: string;
        fileSize: number;
        format: string;
        fps: number;
      }
    | null
  > {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`
      );

      const data = JSON.parse(stdout);
      const videoStream = data.streams.find((s: { codec_type: string }) => s.codec_type === 'video');

      if (!videoStream) {
        return null;
      }

      const duration = parseFloat(data.format.duration);
      const width = videoStream.width;
      const height = videoStream.height;
      const fpsStr = videoStream.r_frame_rate || '30/1';
      const [num, den] = fpsStr.split('/').map(Number);
      const fps = Math.round(num / den);

      return {
        duration,
        resolution: `${width}x${height}`,
        fileSize: parseInt(data.format.size, 10),
        format: data.format.format_name,
        fps,
      };
    } catch (error) {
      logger.error('ffprobe実行エラー', error);
      return null;
    }
  }
}
