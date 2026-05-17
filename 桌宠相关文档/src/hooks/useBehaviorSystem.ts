// 角色动作系统 - 空闲行为、悬停反应、眼球跟随
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EmotionLabel } from '../types';

// ===== 动作类型定义 =====
export type IdleActionId =
  | 'mumble'        // 自言自语
  | 'stretch'       // 伸懒腰
  | 'yawn'          // 打哈欠
  | 'look_around'   // 东张西望
  | 'hum'           // 哼歌
  | 'doodle'        // 涂鸦
  | 'read'          // 看书
  | 'exercise'      // 做体操
  | 'nod_off'       // 打瞌睡
  | 'wiggle'        // 扭动身体
  | 'spin'          // 转圈
  | 'peek'          // 偷看用户
  | 'wave'          // 挥手
  | 'jump'          // 跳跃
  | 'sit_down'      // 坐下
  | 'lie_down';     // 躺下

export interface IdleAction {
  id: IdleActionId;
  name: string;
  emoji: string;
  duration: number; // ms
  dialogue: string[]; // 角色说的话
  emotionEffect?: Partial<{ P: number; A: number; D: number }>;
  animationClass: string;
  minInterval: number; // 最小触发间隔 ms
  probability: number; // 触发概率 0-1
  timePreference?: string[]; // 偏好时段
  emotionPreference?: EmotionLabel[]; // 偏好情绪
}

// ===== 空闲动作库 =====
const IDLE_ACTIONS: IdleAction[] = [
  {
    id: 'mumble',
    name: '自言自语',
    emoji: '💭',
    duration: 3000,
    dialogue: ['嗯...今天做什么好呢...', '好无聊啊...', '肚子有点饿了...', '要是有人陪我聊天就好了...'],
    emotionEffect: { A: -0.05 },
    animationClass: 'action-mumble',
    minInterval: 60000,
    probability: 0.25,
  },
  {
    id: 'stretch',
    name: '伸懒腰',
    emoji: '🙆',
    duration: 2500,
    dialogue: ['嗯~伸个懒腰~', '坐太久了，活动一下~'],
    emotionEffect: { P: 0.05, A: 0.1 },
    animationClass: 'action-stretch',
    minInterval: 120000,
    probability: 0.2,
    timePreference: ['afternoon', 'evening'],
  },
  {
    id: 'yawn',
    name: '打哈欠',
    emoji: '🥱',
    duration: 3000,
    dialogue: ['哈~欠~', '好困...', '眼皮好重...'],
    emotionEffect: { A: -0.1, P: -0.05 },
    animationClass: 'action-yawn',
    minInterval: 90000,
    probability: 0.2,
    timePreference: ['late_night', 'dawn'],
    emotionPreference: ['sleepy', 'bored', 'calm'],
  },
  {
    id: 'look_around',
    name: '东张西望',
    emoji: '👀',
    duration: 4000,
    dialogue: ['嗯？那边有什么？', '这个桌面好大啊~'],
    emotionEffect: { A: 0.05 },
    animationClass: 'action-look-around',
    minInterval: 45000,
    probability: 0.3,
  },
  {
    id: 'hum',
    name: '哼歌',
    emoji: '🎵',
    duration: 5000,
    dialogue: ['♪~啦啦啦~♪', '🎵~哼哼~🎵'],
    emotionEffect: { P: 0.1, A: 0.05 },
    animationClass: 'action-hum',
    minInterval: 120000,
    probability: 0.15,
    emotionPreference: ['happy', 'calm', 'excited'],
  },
  {
    id: 'doodle',
    name: '涂鸦',
    emoji: '✏️',
    duration: 4000,
    dialogue: ['画个圈圈...', '嘿嘿，画好了！'],
    emotionEffect: { P: 0.05 },
    animationClass: 'action-doodle',
    minInterval: 180000,
    probability: 0.1,
    timePreference: ['morning', 'afternoon'],
  },
  {
    id: 'read',
    name: '看书',
    emoji: '📖',
    duration: 6000,
    dialogue: ['这本书好有趣~', '嗯嗯，原来是这样...'],
    emotionEffect: { P: 0.05, A: -0.05 },
    animationClass: 'action-read',
    minInterval: 150000,
    probability: 0.12,
    emotionPreference: ['calm', 'happy'],
  },
  {
    id: 'exercise',
    name: '做体操',
    emoji: '🤸',
    duration: 4000,
    dialogue: ['一二三四！', '运动一下身体~'],
    emotionEffect: { P: 0.05, A: 0.15 },
    animationClass: 'action-exercise',
    minInterval: 300000,
    probability: 0.08,
    timePreference: ['morning', 'afternoon'],
  },
  {
    id: 'nod_off',
    name: '打瞌睡',
    emoji: '😴',
    duration: 5000,
    dialogue: ['zzZ...', '嗯...再睡一会...', '呼...呼...'],
    emotionEffect: { A: -0.15, P: -0.05 },
    animationClass: 'action-nod-off',
    minInterval: 120000,
    probability: 0.2,
    timePreference: ['late_night', 'dawn', 'night'],
    emotionPreference: ['sleepy', 'bored'],
  },
  {
    id: 'wiggle',
    name: '扭动身体',
    emoji: '💃',
    duration: 2500,
    dialogue: ['扭一扭~', '身体痒痒的~'],
    emotionEffect: { P: 0.05, A: 0.08 },
    animationClass: 'action-wiggle',
    minInterval: 60000,
    probability: 0.2,
    emotionPreference: ['happy', 'excited', 'bored'],
  },
  {
    id: 'spin',
    name: '转圈',
    emoji: '🌀',
    duration: 2000,
    dialogue: ['转转转~', '哇，有点晕...'],
    emotionEffect: { P: 0.08, A: 0.12 },
    animationClass: 'action-spin',
    minInterval: 120000,
    probability: 0.1,
    emotionPreference: ['happy', 'excited'],
  },
  {
    id: 'peek',
    name: '偷看用户',
    emoji: '😏',
    duration: 3000,
    dialogue: ['你在忙什么呢？', '偷偷看一眼~'],
    emotionEffect: { A: 0.05 },
    animationClass: 'action-peek',
    minInterval: 90000,
    probability: 0.2,
  },
  {
    id: 'wave',
    name: '挥手',
    emoji: '👋',
    duration: 2000,
    dialogue: ['嗨~', '你好呀~'],
    emotionEffect: { P: 0.05, A: 0.05 },
    animationClass: 'action-wave',
    minInterval: 180000,
    probability: 0.1,
  },
  {
    id: 'jump',
    name: '跳跃',
    emoji: '⬆️',
    duration: 1500,
    dialogue: ['跳！', '嘿咻~'],
    emotionEffect: { P: 0.08, A: 0.15 },
    animationClass: 'action-jump',
    minInterval: 90000,
    probability: 0.12,
    emotionPreference: ['happy', 'excited'],
  },
  {
    id: 'sit_down',
    name: '坐下',
    emoji: '🪑',
    duration: 5000,
    dialogue: ['坐一会儿~', '站着好累...'],
    emotionEffect: { A: -0.08 },
    animationClass: 'action-sit-down',
    minInterval: 180000,
    probability: 0.12,
    emotionPreference: ['calm', 'bored', 'sleepy'],
  },
  {
    id: 'lie_down',
    name: '躺下',
    emoji: '😴',
    duration: 6000,
    dialogue: ['躺一会儿...', '好舒服~'],
    emotionEffect: { A: -0.12, P: 0.03 },
    animationClass: 'action-lie-down',
    minInterval: 300000,
    probability: 0.08,
    timePreference: ['night', 'late_night'],
    emotionPreference: ['sleepy', 'calm', 'bored'],
  },
];

// ===== Hook: 空闲行为系统 =====
export function useIdleBehavior(
  currentEmotion: EmotionLabel,
  currentTimePeriod: string,
  isChatOpen: boolean,
  isDragging: boolean,
  lastInteractionTime: Date
) {
  const [currentAction, setCurrentAction] = useState<IdleAction | null>(null);
  const [actionDialogue, setActionDialogue] = useState('');
  const [isActionActive, setIsActionActive] = useState(false);
  const lastActionTime = useRef(Date.now());
  const actionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 获取可用的动作列表（根据时段和情绪过滤）
  const getAvailableActions = useCallback((): IdleAction[] => {
    const now = Date.now();
    return IDLE_ACTIONS.filter(action => {
      // 检查最小间隔
      if (now - lastActionTime.current < action.minInterval) return false;
      // 检查时段偏好
      if (action.timePreference && !action.timePreference.includes(currentTimePeriod)) return false;
      // 检查情绪偏好
      if (action.emotionPreference && !action.emotionPreference.includes(currentEmotion)) return false;
      return true;
    });
  }, [currentEmotion, currentTimePeriod]);

  // 触发一个随机动作
  const triggerRandomAction = useCallback(() => {
    // 如果正在聊天或拖拽，不触发
    if (isChatOpen || isDragging) return;

    // 检查空闲时间（至少30秒无交互）
    const idleTime = Date.now() - lastInteractionTime.getTime();
    if (idleTime < 30000) return;

    const available = getAvailableActions();
    if (available.length === 0) return;

    // 按概率随机选择
    const rand = Math.random();
    let cumulative = 0;
    let selectedAction: IdleAction | typeof available[0] = available[0];

    for (const action of available) {
      cumulative += action.probability;
      if (rand <= cumulative) {
        selectedAction = action;
        break;
      }
    }

    // 触发动作
    setCurrentAction(selectedAction);
    setIsActionActive(true);
    setActionDialogue(selectedAction.dialogue[Math.floor(Math.random() * selectedAction.dialogue.length)]);
    lastActionTime.current = Date.now();

    // 动作结束后清除
    if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    actionTimerRef.current = setTimeout(() => {
      setIsActionActive(false);
      setCurrentAction(null);
      setActionDialogue('');
    }, selectedAction.duration);
  }, [isChatOpen, isDragging, lastInteractionTime, getAvailableActions]);

  // 定时检查是否触发随机动作（每15-30秒检查一次）
  useEffect(() => {
    if (checkTimerRef.current) clearInterval(checkTimerRef.current);

    // 随机间隔 15-30 秒
    const scheduleNext = () => {
      const delay = 15000 + Math.random() * 15000;
      checkTimerRef.current = setTimeout(() => {
        triggerRandomAction();
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
      if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    };
  }, [triggerRandomAction]);

  return {
    currentAction,
    actionDialogue,
    isActionActive,
    triggerRandomAction,
  };
}

// ===== Hook: 鼠标悬停反应 =====
export function useHoverReaction(
  characterRef: React.RefObject<HTMLDivElement | null>,
  isChatOpen: boolean
) {
  const [isHovering, setIsHovering] = useState(false);
  const [hoverReaction, setHoverReaction] = useState<string>('');
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const HOVER_REACTIONS = [
    '嗯？',
    '怎么了？',
    '你在看我吗？',
    '有什么事吗~',
    '盯着我看干嘛~',
    '要和我玩吗？',
    '嘻嘻~',
  ];

  const LONG_HOVER_REACTIONS = [
    '你一直盯着我看...好害羞...',
    '是不是觉得我很可爱？',
    '再看我就要收费了哦~',
    '你...你是不是喜欢我？',
  ];

  useEffect(() => {
    const el = characterRef.current;
    if (!el) return;

    const handleMouseEnter = () => {
      if (isChatOpen) return;
      setIsHovering(true);
      setHoverReaction(HOVER_REACTIONS[Math.floor(Math.random() * HOVER_REACTIONS.length)]);

      // 长时间悬停（5秒）触发特殊反应
      longHoverTimerRef.current = setTimeout(() => {
        setHoverReaction(LONG_HOVER_REACTIONS[Math.floor(Math.random() * LONG_HOVER_REACTIONS.length)]);
      }, 5000);
    };

    const handleMouseLeave = () => {
      setIsHovering(false);
      setHoverReaction('');
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (longHoverTimerRef.current) clearTimeout(longHoverTimerRef.current);
    };

    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mouseenter', handleMouseEnter);
      el.removeEventListener('mouseleave', handleMouseLeave);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (longHoverTimerRef.current) clearTimeout(longHoverTimerRef.current);
    };
  }, [characterRef, isChatOpen]);

  return { isHovering, hoverReaction };
}

// ===== Hook: 眼球跟随鼠标 =====
export function useEyeTracking() {
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 计算鼠标相对于屏幕中心的角度
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const dx = (e.clientX - centerX) / centerX; // -1 to 1
      const dy = (e.clientY - centerY) / centerY; // -1 to 1

      // 限制眼球移动范围
      const maxOffset = 3; // px
      setEyePosition({
        x: dx * maxOffset,
        y: dy * maxOffset,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return eyePosition;
}

// ===== Hook: 环境感知 =====
export function useEnvironmentAwareness() {
  const [isIdle, setIsIdle] = useState(false);
  const [idleDuration, setIdleDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWindowFocused, setIsWindowFocused] = useState(true);

  useEffect(() => {
    let idleTimer: ReturnType<typeof setInterval>;
    let lastActivity = Date.now();

    const resetIdle = () => {
      lastActivity = Date.now();
      setIsIdle(false);
      setIdleDuration(0);
    };

    // 监听用户活动
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetIdle);
    });

    // 每秒检查空闲状态
    idleTimer = setInterval(() => {
      const elapsed = Date.now() - lastActivity;
      setIdleDuration(elapsed);
      setIsIdle(elapsed > 60000); // 60秒算空闲
    }, 1000);

    // 全屏检测
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // 窗口焦点
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetIdle);
      });
      clearInterval(idleTimer);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return { isIdle, idleDuration, isFullscreen, isWindowFocused };
}
