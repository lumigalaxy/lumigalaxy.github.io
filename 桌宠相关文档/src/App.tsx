import { useState, useCallback, useEffect } from 'react';
import type { CharacterState, ChatMessage, PADValues, EmotionLabel } from './types';
import { getCharacterById } from './data/characters';
import { generateResponse, generateActionResponse } from './data/dialogues';
import { updateEmotion, classifyEmotion, applyDecay } from './hooks/useEmotionSystem';
import { useTimePeriod } from './hooks/useTimePeriod';
import { calculateAffinityLevel, addAffinity } from './hooks/useAffinity';
import { useEnvironmentAwareness } from './hooks/useBehaviorSystem';
import { loadData, saveData, getTodayStats, updateDailyStats, canGainAffinity, addChatMessage } from './utils/storage';
import type { StorageSchema } from './utils/storage';
import Character from './components/Character';
import ChatWindow from './components/ChatWindow';
import ContextMenu from './components/ContextMenu';
import StatusBar from './components/StatusBar';
import PetChallenge from './components/games/PetChallenge';
import RockPaperScissors from './components/games/RockPaperScissors';
import MemoryGame from './components/games/MemoryGame';

type MiniGameType = 'pet_challenge' | 'rock_paper_scissors' | 'memory' | null;

function createInitialState(charId: string): CharacterState {
  const charDef = getCharacterById(charId);
  if (!charDef) throw new Error(`Character ${charId} not found`);
  return {
    id: charDef.id,
    name: charDef.name,
    nameCN: charDef.nameCN,
    emotion: classifyEmotion(charDef.defaultPad),
    pad: { ...charDef.defaultPad },
    affinity: 0,
    affinityLevel: 0,
    lastInteraction: new Date(),
  };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export default function App() {
  // v0.4 桌面端 MVP：默认角色为 ALN-003 Lumi（结对编程伙伴），后续支持 5 角色切换。
  const DEFAULT_CHARACTER_ID = 'cla';
  const [selectedCharacterId] = useState(DEFAULT_CHARACTER_ID);
  const [characterStates, setCharacterStates] = useState<CharacterState>(() => {
    const defaultState: StorageSchema['character_state'] = {
      id: DEFAULT_CHARACTER_ID,
      pad: { P: 0, A: 0, D: 0 },
      affinity: 0,
      lastInteraction: new Date().toISOString(),
    };
    const saved = loadData('character_state', defaultState);
    const validId = getCharacterById(saved.id) ? saved.id : DEFAULT_CHARACTER_ID;
    const charDef = getCharacterById(validId);
    if (saved && charDef) {
      return {
        id: validId,
        name: charDef.name,
        nameCN: charDef.nameCN,
        emotion: classifyEmotion(saved.pad),
        pad: saved.pad,
        affinity: saved.affinity,
        affinityLevel: calculateAffinityLevel(saved.affinity),
        lastInteraction: new Date(saved.lastInteraction),
      };
    }
    return createInitialState(DEFAULT_CHARACTER_ID);
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = loadData('chat_messages', []);
    return saved.map(m => ({
      id: m.id,
      role: m.role as 'user' | 'character' | 'system',
      content: m.content,
      timestamp: new Date(m.timestamp),
      ...(m.emotion ? { emotion: m.emotion as EmotionLabel } : {}),
    }));
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0 });
  const [greetingShown, setGreetingShown] = useState(false);
  const [currentGame, setCurrentGame] = useState<MiniGameType>(null);
  const [chatAutoCloseTimer, setChatAutoCloseTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const { currentPeriod, getGreeting } = useTimePeriod();
  const { isIdle, idleDuration, isFullscreen } = useEnvironmentAwareness();

  // 持久化角色状态
  useEffect(() => {
    const timer = setInterval(() => {
      saveData('character_state', {
        id: characterStates.id,
        pad: characterStates.pad,
        affinity: characterStates.affinity,
        lastInteraction: characterStates.lastInteraction.toISOString(),
      });
    }, 5000); // 每5秒保存
    return () => clearInterval(timer);
  }, [characterStates]);

  // 持久化聊天消息
  useEffect(() => {
    if (chatMessages.length > 0) {
      const msg = chatMessages[chatMessages.length - 1];
      addChatMessage({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        ...(msg.emotion ? { emotion: msg.emotion } : {}),
      });
    }
  }, [chatMessages.length]);

  // 环境感知 - 空闲时角色反应
  useEffect(() => {
    if (isIdle && idleDuration > 120000 && !chatOpen && !currentGame) {
      // 空闲超过2分钟，角色主动说话
      const idleDialogues = [
        '你在忙吗？',
        '好无聊啊...来陪我玩嘛~',
        '你还在吗？',
        '我等你好久了...',
        '要不要玩个小游戏？',
      ];
      const msg: ChatMessage = {
        id: generateId(),
        role: 'character',
        content: idleDialogues[Math.floor(Math.random() * idleDialogues.length)],
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev.slice(-50), msg]);
    }
  }, [isIdle, idleDuration, chatOpen, currentGame]);

  // 全屏检测 - 角色安静
  useEffect(() => {
    if (isFullscreen && chatOpen) {
      setChatOpen(false);
    }
  }, [isFullscreen]);

  // 聊天自动关闭（3分钟无输入）
  useEffect(() => {
    if (chatOpen) {
      if (chatAutoCloseTimer) clearTimeout(chatAutoCloseTimer);
      setChatAutoCloseTimer(setTimeout(() => {
        setChatOpen(false);
      }, 180000)); // 3分钟
    }
    return () => {
      if (chatAutoCloseTimer) clearTimeout(chatAutoCloseTimer);
    };
  }, [chatOpen, chatMessages.length]);

  // Show time-based greeting on mount
  useEffect(() => {
    if (!greetingShown) {
      const greeting = getGreeting(selectedCharacterId);
      const greetingMsg: ChatMessage = {
        id: generateId(),
        role: 'character',
        content: greeting,
        timestamp: new Date(),
        emotion: characterStates.emotion,
      };
      setChatMessages([greetingMsg]);
      setGreetingShown(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Emotion decay every hour
  useEffect(() => {
    const interval = setInterval(() => {
      setCharacterStates((prev) => {
        const newPad = applyDecay(prev.pad);
        const newEmotion = classifyEmotion(newPad);
        return { ...prev, pad: newPad, emotion: newEmotion };
      });
    }, 3600000);
    return () => clearInterval(interval);
  }, []);

  const handleCharacterClick = useCallback(() => {
    setChatOpen((prev) => !prev);
  }, []);

  const handleCharacterDoubleClick = useCallback(() => {
    setChatOpen(true);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  }, []);

  const handleContextAction = useCallback(
    (actionId: string) => {
      // 小游戏入口
      if (actionId === 'pet_challenge') {
        setCurrentGame('pet_challenge');
        setContextMenu({ visible: false, x: 0, y: 0 });
        return;
      }
      if (actionId === 'rock_paper_scissors') {
        setCurrentGame('rock_paper_scissors');
        setContextMenu({ visible: false, x: 0, y: 0 });
        return;
      }
      if (actionId === 'memory_game') {
        setCurrentGame('memory');
        setContextMenu({ visible: false, x: 0, y: 0 });
        return;
      }

      const response = generateActionResponse(selectedCharacterId, actionId);
      const emotionDelta: PADValues = {
        P: response.emotionChange.P ?? 0,
        A: response.emotionChange.A ?? 0,
        D: response.emotionChange.D ?? 0,
      };

      const affinityGain = actionId === 'pat_head' ? 5 : actionId === 'feed' ? 8 : 2;

      setCharacterStates((prev) => {
        const newPad = updateEmotion(prev.pad, emotionDelta);
        const newEmotion = classifyEmotion(newPad);
        const actualGain = canGainAffinity(affinityGain) ? affinityGain : 0;
        const newAffinity = addAffinity(prev.affinity, actualGain);
        const newLevel = calculateAffinityLevel(newAffinity);
        if (actualGain > 0) {
          updateDailyStats({ affinity_gained: getTodayStats().affinity_gained + actualGain });
        }
        return {
          ...prev,
          pad: newPad,
          emotion: newEmotion,
          affinity: newAffinity,
          affinityLevel: newLevel,
          lastInteraction: new Date(),
        };
      });

      const newMsg: ChatMessage = {
        id: generateId(),
        role: 'character',
        content: response.text,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, newMsg]);
      setChatOpen(true);
    },
    [selectedCharacterId]
  );

  const handleSendMessage = useCallback(
    (message: string) => {
      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: message,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, userMsg]);

      const response = generateResponse(selectedCharacterId, message, {
        timePeriod: currentPeriod.id,
        emotion: characterStates.emotion,
        affinityLevel: characterStates.affinityLevel,
      });

      const emotionDelta: PADValues = {
        P: response.emotionChange.P ?? 0,
        A: response.emotionChange.A ?? 0,
        D: response.emotionChange.D ?? 0,
      };

      setCharacterStates((prev) => {
        const newPad = updateEmotion(prev.pad, emotionDelta);
        const newEmotion = classifyEmotion(newPad);
        const actualGain = canGainAffinity(3) ? 3 : 0;
        const newAffinity = addAffinity(prev.affinity, actualGain);
        const newLevel = calculateAffinityLevel(newAffinity);
        if (actualGain > 0) {
          updateDailyStats({
            interactions: getTodayStats().interactions + 1,
            affinity_gained: getTodayStats().affinity_gained + actualGain,
          });
        }
        return {
          ...prev,
          pad: newPad,
          emotion: newEmotion,
          affinity: newAffinity,
          affinityLevel: newLevel,
          lastInteraction: new Date(),
        };
      });

      setTimeout(() => {
        const charMsg: ChatMessage = {
          id: generateId(),
          role: 'character',
          content: response.text,
          timestamp: new Date(),
          emotion: characterStates.emotion,
        };
        setChatMessages((prev) => [...prev, charMsg]);
      }, 1000 + Math.random() * 1000);
    },
    [selectedCharacterId, currentPeriod.id, characterStates.emotion, characterStates.affinityLevel]
  );

  const handleCloseChat = useCallback(() => {
    setChatOpen(false);
  }, []);

  // 小游戏完成回调
  const handleGameComplete = useCallback((affinityGain: number) => {
    setCurrentGame(null);
    if (affinityGain > 0) {
      const actualGain = canGainAffinity(affinityGain) ? affinityGain : 0;
      setCharacterStates(prev => {
        const newAffinity = addAffinity(prev.affinity, actualGain);
        const newLevel = calculateAffinityLevel(newAffinity);
        updateDailyStats({
          games_played: getTodayStats().games_played + 1,
          affinity_gained: getTodayStats().affinity_gained + actualGain,
        });
        return { ...prev, affinity: newAffinity, affinityLevel: newLevel, lastInteraction: new Date() };
      });

      // 游戏完成消息
      const gameMsg: ChatMessage = {
        id: generateId(),
        role: 'character',
        content: '玩得好开心！下次再来吧~',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, gameMsg]);
    }
  }, []);

  const handleCloseGame = useCallback(() => {
    setCurrentGame(null);
  }, []);

  return (
    <div className={`app-container${chatOpen ? ' chat-open' : ''}`}>
      <Character
        character={characterStates}
        onClick={handleCharacterClick}
        onDoubleClick={handleCharacterDoubleClick}
        onContextMenu={handleContextMenu}
        chatOpen={chatOpen}
        currentTimePeriod={currentPeriod.id}
      />
      <ChatWindow
        character={characterStates}
        messages={chatMessages}
        isOpen={chatOpen}
        onClose={handleCloseChat}
        onSendMessage={handleSendMessage}
      />
      <ContextMenu
        character={characterStates}
        x={contextMenu.x}
        y={contextMenu.y}
        visible={contextMenu.visible}
        onAction={handleContextAction}
        onClose={handleContextMenuClose}
      />
      <StatusBar character={characterStates} timePeriod={currentPeriod} />

      {/* 小游戏 */}
      {currentGame === 'pet_challenge' && (
        <PetChallenge
          characterName={characterStates.nameCN}
          onComplete={handleGameComplete}
          onClose={handleCloseGame}
        />
      )}
      {currentGame === 'rock_paper_scissors' && (
        <RockPaperScissors
          characterName={characterStates.nameCN}
          onComplete={handleGameComplete}
          onClose={handleCloseGame}
        />
      )}
      {currentGame === 'memory' && (
        <MemoryGame
          characterName={characterStates.nameCN}
          onComplete={handleGameComplete}
          onClose={handleCloseGame}
        />
      )}
    </div>
  );
}
