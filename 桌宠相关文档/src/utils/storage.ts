// 数据持久化 - localStorage 封装
const STORAGE_PREFIX = 'rm_desktop_';

export interface StorageSchema {
  character_state: {
    id: string;
    pad: { P: number; A: number; D: number };
    affinity: number;
    lastInteraction: string;
  };
  chat_messages: Array<{
    id: string;
    role: string;
    content: string;
    timestamp: string;
    emotion?: string;
  }>;
  game_stats: Record<string, {
    played: number;
    best_score: number;
    total_score: number;
    last_played: string;
  }>;
  daily_stats: {
    date: string;
    interactions: number;
    affinity_gained: number;
    games_played: number;
  };
  settings: {
    selected_character_id: string;
    disturb_level: number; // 0=专注 1=安静 2=正常 3=活泼
    volume: number;
  };
  idle_actions_log: Array<{
    timestamp: string;
    action_id: string;
  }>;
}

function getKey(key: keyof StorageSchema): string {
  return `${STORAGE_PREFIX}${key}`;
}

export function saveData<K extends keyof StorageSchema>(key: K, data: StorageSchema[K]): void {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(getKey(key), serialized);
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
  }
}

export function loadData<K extends keyof StorageSchema>(key: K, defaultValue: StorageSchema[K]): StorageSchema[K] {
  try {
    const serialized = localStorage.getItem(getKey(key));
    if (serialized === null) return defaultValue;
    return JSON.parse(serialized) as StorageSchema[K];
  } catch (error) {
    console.error(`Failed to load ${key}:`, error);
    return defaultValue;
  }
}

export function removeData<K extends keyof StorageSchema>(key: K): void {
  try {
    localStorage.removeItem(getKey(key));
  } catch (error) {
    console.error(`Failed to remove ${key}:`, error);
  }
}

// 每日统计辅助
export function getTodayStats(): StorageSchema['daily_stats'] {
  const today = new Date().toISOString().split('T')[0];
  const stats = loadData('daily_stats', {
    date: '',
    interactions: 0,
    affinity_gained: 0,
    games_played: 0,
  });
  if (stats.date !== today) {
    // 新的一天，重置统计
    const newStats = {
      date: today,
      interactions: 0,
      affinity_gained: 0,
      games_played: 0,
    };
    saveData('daily_stats', newStats);
    return newStats;
  }
  return stats;
}

export function updateDailyStats(updates: Partial<StorageSchema['daily_stats']>): StorageSchema['daily_stats'] {
  const stats = getTodayStats();
  const newStats = { ...stats, ...updates };
  saveData('daily_stats', newStats);
  return newStats;
}

// 好感度每日上限检查
export function canGainAffinity(amount: number): boolean {
  const stats = getTodayStats();
  return stats.affinity_gained + amount <= 50;
}

// 聊天消息管理（最多保留100条）
export function addChatMessage(msg: StorageSchema['chat_messages'][0]): void {
  const messages = loadData('chat_messages', []);
  messages.push(msg);
  if (messages.length > 100) {
    messages.splice(0, messages.length - 100);
  }
  saveData('chat_messages', messages);
}

export function getChatMessages(): StorageSchema['chat_messages'] {
  return loadData('chat_messages', []);
}

// 游戏统计管理
export function updateGameStats(gameId: string, score: number): StorageSchema['game_stats'][string] {
  const stats = loadData('game_stats', {});
  const existing = stats[gameId] || { played: 0, best_score: 0, total_score: 0, last_played: '' };
  const updated = {
    played: existing.played + 1,
    best_score: Math.max(existing.best_score, score),
    total_score: existing.total_score + score,
    last_played: new Date().toISOString(),
  };
  stats[gameId] = updated;
  saveData('game_stats', stats);
  return updated;
}
