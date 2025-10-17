/**
 * UGC広告プロンプトテンプレート
 *
 * 6種類のUGCスタイルに対応したプロンプトテンプレートを提供
 */

import type { UGCStyle } from '../types';

/**
 * UGCプロンプトテンプレート定義
 */
export const ugcPromptTemplates: Record<UGCStyle, string> = {
  casual:
    'A casual smartphone video showing {product} in everyday use, ' +
    'natural lighting, slight camera shake, authentic user perspective, ' +
    'relaxed atmosphere, genuine moments',

  testimonial:
    'A genuine user testimonial video featuring {product}, ' +
    'speaking directly to camera, home environment, honest reaction, ' +
    'personal story, authentic emotion, trustworthy delivery',

  tutorial:
    'A step-by-step tutorial video demonstrating {product}, ' +
    'clear close-ups, user\'s hands visible, helpful annotations, ' +
    'easy to follow, instructional tone, practical tips',

  unboxing:
    'An unboxing video of {product}, ' +
    'excited user reaction, natural lighting, first impressions, ' +
    'product packaging, anticipation, discovery moment',

  lifestyle:
    'A lifestyle video featuring {product} in daily routine, ' +
    'aesthetic but authentic, natural movements, relatable scenarios, ' +
    'seamless integration, aspirational yet achievable',

  comparison:
    'A before-and-after comparison video showcasing {product} impact, ' +
    'side-by-side views, clear results, user satisfaction, ' +
    'measurable difference, transformation story',
};

/**
 * プロンプトテンプレートにプロダクト情報を挿入
 *
 * @param style - UGCスタイル
 * @param productDescription - プロダクト説明
 * @param additionalPrompts - 追加プロンプト（オプション）
 * @returns 完成したプロンプト
 */
export function buildPrompt(
  style: UGCStyle,
  productDescription: string,
  additionalPrompts?: string[]
): string {
  const template = ugcPromptTemplates[style];
  let prompt = template.replace('{product}', productDescription);

  if (additionalPrompts && additionalPrompts.length > 0) {
    prompt += '. ' + additionalPrompts.join('. ');
  }

  return prompt;
}

/**
 * バリエーション用のトーン調整
 */
export const toneVariations = {
  energetic: 'energetic and enthusiastic tone',
  calm: 'calm and relaxed atmosphere',
  friendly: 'warm and friendly delivery',
  professional: 'polished yet approachable style',
} as const;

/**
 * アスペクト比に応じたフレーミング調整
 */
export const framingAdjustments = {
  '16:9': 'wide landscape framing, cinematic composition',
  '9:16': 'vertical portrait framing, mobile-first composition',
  '1:1': 'square framing, balanced composition',
  '4:5': 'vertical framing, Instagram-optimized composition',
} as const;

/**
 * 時間の長さに応じたペーシング調整
 */
export const pacingAdjustments = {
  short: 'quick cuts, fast-paced, attention-grabbing',
  medium: 'moderate pacing, well-balanced rhythm',
  long: 'slower pacing, detailed exploration, thorough demonstration',
} as const;

/**
 * バリエーション豊かなプロンプトを生成
 *
 * @param style - UGCスタイル
 * @param productDescription - プロダクト説明
 * @param options - カスタマイズオプション
 * @returns カスタマイズされたプロンプト
 */
export function buildVariedPrompt(
  style: UGCStyle,
  productDescription: string,
  options: {
    tone?: keyof typeof toneVariations;
    framing?: keyof typeof framingAdjustments;
    pacing?: keyof typeof pacingAdjustments;
    additionalPrompts?: string[];
  } = {}
): string {
  let prompt = buildPrompt(style, productDescription, options.additionalPrompts);

  // トーン調整
  if (options.tone) {
    prompt += `. ${toneVariations[options.tone]}`;
  }

  // フレーミング調整
  if (options.framing) {
    prompt += `. ${framingAdjustments[options.framing]}`;
  }

  // ペーシング調整
  if (options.pacing) {
    prompt += `. ${pacingAdjustments[options.pacing]}`;
  }

  return prompt;
}

/**
 * 複数スタイルのプロンプトを一括生成
 *
 * @param styles - UGCスタイル配列
 * @param productDescription - プロダクト説明
 * @returns スタイル別プロンプトマップ
 */
export function buildBatchPrompts(
  styles: UGCStyle[],
  productDescription: string
): Record<UGCStyle, string> {
  const prompts = {} as Record<UGCStyle, string>;

  for (const style of styles) {
    prompts[style] = buildPrompt(style, productDescription);
  }

  return prompts;
}

/**
 * ランダムにバリエーションを追加したプロンプト生成
 *
 * @param style - UGCスタイル
 * @param productDescription - プロダクト説明
 * @returns バリエーション付きプロンプト
 */
export function buildRandomVariedPrompt(
  style: UGCStyle,
  productDescription: string
): string {
  const tones = Object.keys(toneVariations) as Array<keyof typeof toneVariations>;
  const pacings = Object.keys(pacingAdjustments) as Array<keyof typeof pacingAdjustments>;

  const randomTone = tones[Math.floor(Math.random() * tones.length)];
  const randomPacing = pacings[Math.floor(Math.random() * pacings.length)];

  return buildVariedPrompt(style, productDescription, {
    tone: randomTone,
    pacing: randomPacing,
  });
}
