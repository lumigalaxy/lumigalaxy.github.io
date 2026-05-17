// 摸头挑战小游戏组件
import React, { useCallback, useRef } from 'react';
import { usePetChallenge } from '../../hooks/useMiniGames';

interface PetChallengeProps {
  characterName: string;
  onComplete: (affinityGain: number) => void;
  onClose: () => void;
}

export default function PetChallenge({ characterName, onComplete, onClose }: PetChallengeProps) {
  const game = usePetChallenge();
  const petAreaRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!game.isPlaying) return;
    const rect = petAreaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    const isCoreZone = dist < rect.width * 0.2;
    const isInZone = dist < rect.width * 0.4;
    game.handlePetStart(isInZone, isCoreZone);
  }, [game]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!game.isPlaying || !petAreaRef.current) return;
    const rect = petAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    const isCoreZone = dist < rect.width * 0.2;
    const isInZone = dist < rect.width * 0.4;
    game.handlePetMove(isInZone, isCoreZone);
  }, [game]);

  const handleMouseUp = useCallback(() => {
    game.handlePetEnd();
  }, [game]);

  const handleComplete = useCallback(() => {
    const gain = game.getAffinityGain();
    onComplete(gain);
    game.closeResult();
  }, [game, onComplete]);

  if (!game.isPlaying && !game.showResult) {
    return (
      <div className="mini-game-overlay" onClick={onClose}>
        <div className="mini-game-panel pet-game-panel" onClick={e => e.stopPropagation()}>
          <div className="mini-game-header">
            <span className="mini-game-title">✋ 摸头挑战</span>
            <button className="mini-game-close" onClick={onClose}>✕</button>
          </div>
          <div className="mini-game-body">
            <div className="pet-game-intro">
              <div className="pet-game-emoji">🐾</div>
              <p>在30秒内，按住鼠标在{characterName}头部抚摸，让舒适度达到100！</p>
              <p className="pet-game-tip">💡 中央区域得分1.5倍，连续抚摸3秒以上有额外加成</p>
            </div>
            <button className="mini-game-start-btn" onClick={game.startGame}>
              开始挑战！
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (game.showResult) {
    const resultConfig: Record<string, { emoji: string; text: string; color: string }> = {
      perfect: { emoji: '🌟', text: '完美通关！', color: '#ffd700' },
      excellent: { emoji: '🎉', text: '优秀！', color: '#ff9500' },
      good: { emoji: '👍', text: '不错！', color: '#34c759' },
      fail: { emoji: '😅', text: '下次加油~', color: '#8e8e93' },
    };
    const config = resultConfig[game.result] || resultConfig.fail;

    return (
      <div className="mini-game-overlay">
        <div className="mini-game-panel pet-game-panel">
          <div className="mini-game-header">
            <span className="mini-game-title">✋ 摸头挑战</span>
          </div>
          <div className="mini-game-body">
            <div className="pet-game-result">
              <div className="pet-result-emoji">{config.emoji}</div>
              <div className="pet-result-text" style={{ color: config.color }}>{config.text}</div>
              <div className="pet-result-score">舒适度: {game.comfort}/100</div>
              <div className="pet-result-affinity">好感度 +{game.getAffinityGain()}</div>
            </div>
            <button className="mini-game-start-btn" onClick={handleComplete}>
              好的！
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 游戏进行中
  const comfortColor = game.comfort < 40 ? '#ff6b6b' : game.comfort < 70 ? '#ffd93d' : '#6bcb77';

  return (
    <div className="mini-game-overlay">
      <div className="mini-game-panel pet-game-panel">
        <div className="mini-game-header">
          <span className="mini-game-title">✋ 摸头挑战</span>
          <span className="pet-game-timer">⏱ {game.timeLeft}s</span>
        </div>
        <div className="mini-game-body">
          {/* 舒适度进度条 */}
          <div className="pet-comfort-bar">
            <div className="pet-comfort-fill" style={{ width: `${game.comfort}%`, background: comfortColor }} />
            <span className="pet-comfort-text">{game.comfort}/100</span>
          </div>

          {/* 抚摸区域 */}
          <div
            ref={petAreaRef}
            className={`pet-area ${game.isPetting && game.isInZone ? 'petting' : ''} ${game.isPetting && game.isCoreZone ? 'core-zone' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div className="pet-zone-label">
              {game.isPetting && game.isCoreZone ? '🌟 核心区域！1.5倍得分！' :
               game.isPetting && game.isInZone ? '✨ 舒适区域' :
               game.isPetting ? '⚠️ 移到角色头部' : '👆 按住鼠标开始抚摸'}
            </div>
            <div className="pet-character-silhouette">
              {game.isPetting ? '😊' : '😐'}
            </div>
            {game.combo >= 3 && <div className="pet-combo">🔥 连续{game.combo}秒！</div>}
          </div>

          {/* 角色反应 */}
          <div className="pet-reaction">{game.characterReaction}</div>
        </div>
      </div>
    </div>
  );
}
