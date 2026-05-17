export interface PADValues {
  P: number; // Pleasure [-1, 1]
  A: number; // Arousal [-1, 1]
  D: number; // Dominance [-1, 1]
}

export type EmotionLabel =
  | 'happy'
  | 'excited'
  | 'shy'
  | 'sad'
  | 'worried'
  | 'sleepy'
  | 'angry'
  | 'surprised'
  | 'calm'
  | 'bored';

export interface CharacterState {
  id: string;
  name: string;
  nameCN: string;
  emotion: EmotionLabel;
  pad: PADValues;
  affinity: number; // 0-10000
  affinityLevel: number; // 0-5
  lastInteraction: Date;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'character' | 'system';
  content: string;
  timestamp: Date;
  emotion?: EmotionLabel;
}

export interface TimePeriod {
  id: string;
  name: string;
  startHour: number;
  endHour: number;
  emotionModifier: Partial<PADValues>;
  greetings: string[];
}

export interface CharacterDefinition {
  id: string;
  name: string;
  nameCN: string;
  avatar: string;
  personality: string;
  defaultPad: PADValues;
}

export interface ContextMenuAction {
  id: string;
  label: string;
  icon: string;
}
