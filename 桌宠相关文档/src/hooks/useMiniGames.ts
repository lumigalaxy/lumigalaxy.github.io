// ===== 摸头挑战小游戏 =====
import { useState, useCallback, useRef, useEffect } from 'react';

interface PetChallengeState {
  isPlaying: boolean;
  comfort: number;       // 舒适度 0-100
  timeLeft: number;      // 剩余时间
  isPetting: boolean;    // 是否在抚摸中
  isInZone: boolean;     // 是否在舒适区域
  isCoreZone: boolean;   // 是否在核心区域
  combo: number;         // 连续抚摸时间(秒)
  result: 'none' | 'perfect' | 'excellent' | 'good' | 'fail';
  characterReaction: string;
  showResult: boolean;
}

const REACTIONS: Record<string, { range: [number, number]; reactions: string[] }> = {
  wary: {
    range: [0, 20],
    reactions: ['你...你要干什么？', '别过来...', '干嘛？'],
  },
  awkward: {
    range: [20, 40],
    reactions: ['嗯...这样...不太习惯...', '好奇怪...', '你干嘛摸我...'],
  },
  relaxed: {
    range: [40, 60],
    reactions: ['嗯...好像...还不错...', '还行吧...', '继续...'],
  },
  enjoy: {
    range: [60, 80],
    reactions: ['好舒服~再摸摸这里...', '嗯~好舒服...', '不要停~'],
  },
  bliss: {
    range: [80, 100],
    reactions: ['呼噜...再...再摸一会儿...', '太舒服了~', '最喜欢你了~'],
  },
};

function getReaction(comfort: number): string {
  for (const [_key, { range, reactions }] of Object.entries(REACTIONS)) {
    if (comfort >= range[0] && comfort < range[1]) {
      return reactions[Math.floor(Math.random() * reactions.length)];
    }
  }
  return REACTIONS.bliss.reactions[0];
}

export function usePetChallenge() {
  const [state, setState] = useState<PetChallengeState>({
    isPlaying: false,
    comfort: 0,
    timeLeft: 30,
    isPetting: false,
    isInZone: false,
    isCoreZone: false,
    combo: 0,
    result: 'none',
    characterReaction: '',
    showResult: false,
  });

  const gameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const petTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const comboTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = useCallback(() => {
    setState({
      isPlaying: true,
      comfort: 0,
      timeLeft: 30,
      isPetting: false,
      isInZone: false,
      isCoreZone: false,
      combo: 0,
      result: 'none',
      characterReaction: '你...你要干什么？',
      showResult: false,
    });

    // 倒计时
    gameTimerRef.current = setInterval(() => {
      setState(prev => {
        const newTime = prev.timeLeft - 1;
        if (newTime <= 0) {
          // 时间到，判定结果
          if (prev.comfort >= 100) {
            return { ...prev, timeLeft: 0, isPlaying: false, result: 'excellent', showResult: true };
          }
          return { ...prev, timeLeft: 0, isPlaying: false, result: 'fail', showResult: true };
        }
        return { ...prev, timeLeft: newTime };
      });
    }, 1000);
  }, []);

  const handlePetStart = useCallback((isInZone: boolean, isCoreZone: boolean) => {
    setState(prev => ({
      ...prev,
      isPetting: true,
      isInZone,
      isCoreZone,
    }));

    // 抚摸中持续增加舒适度
    petTimerRef.current = setInterval(() => {
      setState(prev => {
        if (!prev.isPetting || !prev.isInZone) return prev;
        const gain = prev.isCoreZone ? 4 : 2;
        const comboBonus = prev.combo >= 3 ? 2 : 0;
        const newComfort = Math.min(100, prev.comfort + gain + comboBonus);
        const reaction = getReaction(newComfort);

        if (newComfort >= 100) {
          // 通关！
          if (gameTimerRef.current) clearInterval(gameTimerRef.current);
          if (petTimerRef.current) clearInterval(petTimerRef.current);
          if (comboTimerRef.current) clearInterval(comboTimerRef.current);
          return {
            ...prev,
            comfort: 100,
            isPlaying: false,
            result: 'perfect',
            showResult: true,
            characterReaction: '最喜欢你了~！❤️',
          };
        }

        return { ...prev, comfort: newComfort, characterReaction: reaction };
      });
    }, 200); // 每200ms增加
  }, []);

  const handlePetMove = useCallback((isInZone: boolean, isCoreZone: boolean) => {
    setState(prev => ({ ...prev, isInZone, isCoreZone }));
  }, []);

  const handlePetEnd = useCallback(() => {
    setState(prev => ({ ...prev, isPetting: false, isInZone: false, isCoreZone: false, combo: 0 }));
    if (petTimerRef.current) clearInterval(petTimerRef.current);
  }, []);

  // 连续抚摸计时
  useEffect(() => {
    if (state.isPetting && state.isInZone) {
      comboTimerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, combo: prev.combo + 1 }));
      }, 1000);
    } else {
      if (comboTimerRef.current) clearInterval(comboTimerRef.current);
    }
    return () => {
      if (comboTimerRef.current) clearInterval(comboTimerRef.current);
    };
  }, [state.isPetting, state.isInZone]);

  // 清理
  useEffect(() => {
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (petTimerRef.current) clearInterval(petTimerRef.current);
      if (comboTimerRef.current) clearInterval(comboTimerRef.current);
    };
  }, []);

  const getAffinityGain = (): number => {
    switch (state.result) {
      case 'perfect': return 8;
      case 'excellent': return 5;
      case 'good': return 3;
      case 'fail': return 1;
      default: return 0;
    }
  };

  const closeResult = useCallback(() => {
    setState(prev => ({ ...prev, showResult: false, result: 'none' }));
  }, []);

  return {
    ...state,
    startGame,
    handlePetStart,
    handlePetMove,
    handlePetEnd,
    getAffinityGain,
    closeResult,
  };
}

// ===== 猜拳大作战 =====
export type Choice = 'rock' | 'paper' | 'scissors';
type RoundResult = 'win' | 'lose' | 'draw';

interface RPSRound {
  playerChoice: Choice;
  characterChoice: Choice;
  result: RoundResult;
}

interface RPSState {
  isPlaying: boolean;
  round: number;
  totalRounds: number;
  playerScore: number;
  characterScore: number;
  currentRound: RPSRound | null;
  history: RPSRound[];
  showResult: boolean;
  finalResult: 'win' | 'lose' | 'draw' | 'none';
  characterDialogue: string;
  isRevealing: boolean;
}

const CHOICES: Choice[] = ['rock', 'paper', 'scissors'];
const CHOICE_EMOJI: Record<Choice, string> = {
  rock: '✊',
  paper: '✋',
  scissors: '✌️',
};
const CHOICE_NAME: Record<Choice, string> = {
  rock: '石头',
  paper: '布',
  scissors: '剪刀',
};

function judge(player: Choice, character: Choice): RoundResult {
  if (player === character) return 'draw';
  if (
    (player === 'rock' && character === 'scissors') ||
    (player === 'paper' && character === 'rock') ||
    (player === 'scissors' && character === 'paper')
  ) return 'win';
  return 'lose';
}

const CHARACTER_DIALOGUES: Record<RoundResult, string[]> = {
  win: ['你赢了！好厉害...', '呜...又输了...', '下次我一定赢！'],
  lose: ['我赢啦~嘿嘿！', '哈哈！太简单了！', '你打不过我的~'],
  draw: ['平局！再来！', '心有灵犀~', '英雄所见略同！'],
};

export function useRockPaperScissors() {
  const [state, setState] = useState<RPSState>({
    isPlaying: false,
    round: 0,
    totalRounds: 5,
    playerScore: 0,
    characterScore: 0,
    currentRound: null,
    history: [],
    showResult: false,
    finalResult: 'none',
    characterDialogue: '来猜拳吧！五局三胜！',
    isRevealing: false,
  });

  const startGame = useCallback(() => {
    setState({
      isPlaying: true,
      round: 0,
      totalRounds: 5,
      playerScore: 0,
      characterScore: 0,
      currentRound: null,
      history: [],
      showResult: false,
      finalResult: 'none',
      characterDialogue: '来猜拳吧！五局三胜！',
      isRevealing: false,
    });
  }, []);

  const makeChoice = useCallback((playerChoice: Choice) => {
    setState(prev => {
      if (!prev.isPlaying || prev.isRevealing) return prev;

      const characterChoice = CHOICES[Math.floor(Math.random() * 3)];
      const result = judge(playerChoice, characterChoice);
      const newRound: RPSRound = { playerChoice, characterChoice, result };
      const newHistory = [...prev.history, newRound];
      const newPlayerScore = prev.playerScore + (result === 'win' ? 1 : 0);
      const newCharacterScore = prev.characterScore + (result === 'lose' ? 1 : 0);
      const newRoundNum = prev.round + 1;

      const dialogue = CHARACTER_DIALOGUES[result][Math.floor(Math.random() * CHARACTER_DIALOGUES[result].length)];

      // 检查是否结束
      const isFinished = newRoundNum >= prev.totalRounds;
      let finalResult: 'win' | 'lose' | 'draw' | 'none' = 'none';
      if (isFinished) {
        if (newPlayerScore > newCharacterScore) finalResult = 'win';
        else if (newPlayerScore < newCharacterScore) finalResult = 'lose';
        else finalResult = 'draw';
      }

      return {
        ...prev,
        currentRound: newRound,
        history: newHistory,
        playerScore: newPlayerScore,
        characterScore: newCharacterScore,
        round: newRoundNum,
        characterDialogue: dialogue,
        isRevealing: true,
        showResult: isFinished,
        finalResult,
      };
    });

    // 揭晓后允许下一轮
    setTimeout(() => {
      setState(prev => ({ ...prev, isRevealing: false }));
    }, 1500);
  }, []);

  const nextRound = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentRound: null,
      characterDialogue: '下一局！准备好了吗？',
    }));
  }, []);

  const closeGame = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPlaying: false,
      showResult: false,
      characterDialogue: '下次再来玩吧~',
    }));
  }, []);

  const getAffinityGain = (): number => {
    switch (state.finalResult) {
      case 'win': return 3;
      case 'lose': return 2;
      case 'draw': return 4;
      default: return 0;
    }
  };

  return {
    ...state,
    startGame,
    makeChoice,
    nextRound,
    closeGame,
    getAffinityGain,
    CHOICE_EMOJI,
    CHOICE_NAME,
  };
}
