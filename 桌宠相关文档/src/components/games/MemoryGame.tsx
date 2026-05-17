// 记忆翻牌小游戏组件
import { useState, useCallback, useEffect, useRef } from 'react';

interface MemoryCard {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryGameProps {
  characterName: string;
  onComplete: (affinityGain: number) => void;
  onClose: () => void;
}

const CARD_EMOJIS = ['🌟', '🌙', '⚡', '🎵', '🌸', '🎀', '🐱', '🐶'];

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function MemoryGame({ characterName: _characterName, onComplete, onClose }: MemoryGameProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [totalPairs, setTotalPairs] = useState(6);
  const [timer, setTimer] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [dialogue, setDialogue] = useState('来玩翻牌游戏吧！找出所有配对！');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCheckingRef = useRef(false);

  const initGame = useCallback((pairs: number = 6) => {
    const selectedEmojis = CARD_EMOJIS.slice(0, pairs);
    const cardPairs = [...selectedEmojis, ...selectedEmojis];
    const shuffled = shuffleArray(cardPairs);
    const newCards: MemoryCard[] = shuffled.map((emoji, i) => ({
      id: i,
      emoji,
      isFlipped: false,
      isMatched: false,
    }));
    setCards(newCards);
    setFlippedCards([]);
    setMoves(0);
    setMatchedPairs(0);
    setTotalPairs(pairs);
    setTimer(0);
    setShowResult(false);
    setIsPlaying(true);
    setDialogue('找出所有配对的卡片吧！');

    timerRef.current = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
  }, []);

  const handleCardClick = useCallback((cardId: number) => {
    if (isCheckingRef.current) return;
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;
    if (flippedCards.length >= 2) return;

    const newCards = cards.map(c =>
      c.id === cardId ? { ...c, isFlipped: true } : c
    );
    setCards(newCards);
    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      isCheckingRef.current = true;

      const [firstId, secondId] = newFlipped;
      const firstCard = newCards.find(c => c.id === firstId)!;
      const secondCard = newCards.find(c => c.id === secondId)!;

      if (firstCard.emoji === secondCard.emoji) {
        // 配对成功
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === firstId || c.id === secondId ? { ...c, isMatched: true } : c
          ));
          setMatchedPairs(p => {
            const newPairs = p + 1;
            if (newPairs >= totalPairs) {
              // 游戏胜利
              if (timerRef.current) clearInterval(timerRef.current);
              setTimeout(() => setShowResult(true), 500);
            }
            return newPairs;
          });
          setDialogue(['配对成功！', '好厉害！', '找到了！'][Math.floor(Math.random() * 3)]);
          setFlippedCards([]);
          isCheckingRef.current = false;
        }, 500);
      } else {
        // 配对失败
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === firstId || c.id === secondId ? { ...c, isFlipped: false } : c
          ));
          setDialogue(['不对哦~', '再想想...', '不是这个~'][Math.floor(Math.random() * 3)]);
          setFlippedCards([]);
          isCheckingRef.current = false;
        }, 800);
      }
    }
  }, [cards, flippedCards, totalPairs]);

  const getAffinityGain = (): number => {
    if (moves <= totalPairs + 2) return 6;
    if (moves <= totalPairs * 2) return 4;
    return 2;
  };

  const handleComplete = useCallback(() => {
    const gain = getAffinityGain();
    onComplete(gain);
    setIsPlaying(false);
  }, [onComplete, getAffinityGain]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 开始界面
  if (!isPlaying && !showResult) {
    return (
      <div className="mini-game-overlay" onClick={onClose}>
        <div className="mini-game-panel memory-game-panel" onClick={e => e.stopPropagation()}>
          <div className="mini-game-header">
            <span className="mini-game-title">🃏 记忆翻牌</span>
            <button className="mini-game-close" onClick={onClose}>✕</button>
          </div>
          <div className="mini-game-body">
            <div className="memory-game-intro">
              <div className="memory-game-emoji">🃏</div>
              <p>翻开卡片找出所有配对！</p>
              <p className="memory-game-tip">💡 步数越少，评价越高</p>
            </div>
            <button className="mini-game-start-btn" onClick={() => initGame(6)}>
              开始游戏！
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 结果界面
  if (showResult) {
    const gain = getAffinityGain();
    const rating = moves <= totalPairs + 2 ? '🌟 完美！' : moves <= totalPairs * 2 ? '👍 不错！' : '😊 加油！';
    return (
      <div className="mini-game-overlay">
        <div className="mini-game-panel memory-game-panel">
          <div className="mini-game-header">
            <span className="mini-game-title">🃏 记忆翻牌</span>
          </div>
          <div className="mini-game-body">
            <div className="memory-game-result">
              <div className="memory-result-emoji">🎉</div>
              <div className="memory-result-rating">{rating}</div>
              <div className="memory-result-stats">
                <span>步数: {moves}</span>
                <span>用时: {timer}秒</span>
              </div>
              <div className="memory-result-affinity">好感度 +{gain}</div>
            </div>
            <button className="mini-game-start-btn" onClick={handleComplete}>
              好的！
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 游戏中
  return (
    <div className="mini-game-overlay">
      <div className="mini-game-panel memory-game-panel">
        <div className="mini-game-header">
          <span className="mini-game-title">🃏 记忆翻牌</span>
          <span className="memory-game-info">步数: {moves} | ⏱ {timer}s</span>
        </div>
        <div className="mini-game-body">
          <div className="memory-dialogue">{dialogue}</div>
          <div className="memory-grid">
            {cards.map(card => (
              <div
                key={card.id}
                className={`memory-card ${card.isFlipped || card.isMatched ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''}`}
                onClick={() => handleCardClick(card.id)}
              >
                <div className="memory-card-inner">
                  <div className="memory-card-front">❓</div>
                  <div className="memory-card-back">{card.emoji}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="memory-progress">
            已配对: {matchedPairs}/{totalPairs}
          </div>
        </div>
      </div>
    </div>
  );
}
