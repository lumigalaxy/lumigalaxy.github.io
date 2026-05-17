// 与 apps/desktop/src/types/index.ts 的 PADValues 兼容
export interface PADValues {
  P: number; // Pleasure  [-1, 1]
  A: number; // Arousal   [-1, 1]
  D: number; // Dominance [-1, 1]
}

export type SpeciesId = 'spa' | 'aln' | 'cla' | 'cor' | 'fls';

/** 5 角色与 v3.2 网页 data-species 一一对应 */
export interface CharacterDefinition {
  /** 编号，如 SPA-001 */
  code: string;
  /** RAG / UI 用的短 id（与网页 data-species 一致） */
  id: SpeciesId;
  /** 英文名 */
  name: string;
  /** 中文名 */
  nameCN: string;
  /** 物种名 */
  species: string;
  /** 母星 */
  motherPlanet: string;
  /** 扇区 */
  sector: string;
  /** 主题色（与 v3.2 配色对齐） */
  themeColor: string;
  /** 像素美术资产前缀（如 alien- / lumi- / corgi-） */
  assetPrefix: string;
  /** 一句话定位 */
  tagline: string;
  /** 性格描述（短） */
  personality: string;
  /** 语言风格 */
  voiceStyle: string;
  /** 默认 PAD 情绪 */
  defaultPad: PADValues;
  /** MBTI 倾向（用于 prompt） */
  mbti: string;
  /** 天敌 */
  nemesis: string;
  /** 标志性台词样本（≥5 条，给 RAG 当 few-shot） */
  signatureLines: string[];
  /** 禁忌：绝不会说/做 */
  taboos: string[];
  /** 角色 Bible 文档路径（相对 repo 根） */
  bibleDoc: string;
}
