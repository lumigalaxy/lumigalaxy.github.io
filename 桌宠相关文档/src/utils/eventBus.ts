// 事件总线 - 跨系统通信
type EventCallback<T = any> = (data: T) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // 返回取消订阅函数
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  emit<T = any>(event: string, data?: T): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  off(event: string): void {
    this.listeners.delete(event);
  }
}

// 单例导出
export const eventBus = new EventBus();

// 事件类型定义
export type EventType =
  | 'chat:message_sent'
  | 'chat:emotion_reply'
  | 'emotion:state_changed'
  | 'emotion:affinity_changed'
  | 'behavior:env_detected'
  | 'behavior:time_period'
  | 'behavior:random_event'
  | 'behavior:idle_action'
  | 'game:started'
  | 'game:completed'
  | 'storage:loaded'
  | 'storage:saved';

// 事件数据类型
export interface ChatMessageEvent {
  text: string;
  sentiment_score: number;
}

export interface EmotionReplyEvent {
  emotion_state: string;
  tone_modifier: number;
}

export interface EmotionStateChangedEvent {
  pad_values: { P: number; A: number; D: number };
  emotion_label: string;
}

export interface AffinityChangedEvent {
  old_level: number;
  new_level: number;
}

export interface EnvDetectedEvent {
  event_type: 'fullscreen' | 'idle' | 'window_focus' | 'window_blur';
  app_name?: string;
  duration?: number;
}

export interface TimePeriodEvent {
  period_id: string;
  time_range: string;
}

export interface RandomEventEvent {
  event_id: string;
  event_data: any;
}

export interface IdleActionEvent {
  action_id: string;
  character_id: string;
}

export interface GameEvent {
  game_id: string;
  result: 'win' | 'lose' | 'draw';
  score: number;
  affinity_gain: number;
}
