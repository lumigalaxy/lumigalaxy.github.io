import { useRef, useCallback, useEffect, useState } from 'react';
import type { CharacterState, EmotionLabel } from '../types';
import { getEmotionEmoji } from '../hooks/useEmotionSystem';
import { useIdleBehavior, useHoverReaction, useEyeTracking } from '../hooks/useBehaviorSystem';

interface CharacterProps {
  character: CharacterState;
  onClick: () => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  chatOpen: boolean;
  currentTimePeriod: string;
}

const emotionAnimationClass: Record<EmotionLabel, string> = {
  happy: 'character-emotion-bounce',
  excited: 'character-emotion-shake',
  shy: 'character-emotion-float',
  sad: 'character-emotion-float',
  worried: 'character-emotion-shake',
  sleepy: 'character-emotion-float',
  angry: 'character-emotion-shake',
  surprised: 'character-emotion-bounce',
  calm: '',
  bored: 'character-emotion-float',
};

export default function Character({
  character,
  onClick,
  onDoubleClick,
  onContextMenu,
  chatOpen,
  currentTimePeriod,
}: CharacterProps) {
  const characterRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 100, y: 150 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const [lastInteraction, setLastInteraction] = useState(new Date());

  // 行为系统 hooks
  const { currentAction, actionDialogue, isActionActive } = useIdleBehavior(
    character.emotion,
    currentTimePeriod,
    chatOpen,
    isDragging,
    lastInteraction
  );
  const { isHovering, hoverReaction } = useHoverReaction(characterRef, chatOpen);
  const eyePosition = useEyeTracking();

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      setIsDragging(true);
      hasMoved.current = false;
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
      setLastInteraction(new Date());
    },
    [position]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const dx = Math.abs(e.clientX - dragStartPos.current.x);
      const dy = Math.abs(e.clientY - dragStartPos.current.y);
      if (dx > 5 || dy > 5) {
        hasMoved.current = true;
      }
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleClick = useCallback(() => {
    if (hasMoved.current) return;
    setLastInteraction(new Date());
    onClick();
  }, [onClick]);

  const handleDblClick = useCallback(() => {
    if (hasMoved.current) return;
    setLastInteraction(new Date());
    onDoubleClick();
  }, [onDoubleClick]);

  const emoji = getEmotionEmoji(character.emotion);
  const emotionClass = emotionAnimationClass[character.emotion] ?? '';
  const stars = '★'.repeat(character.affinityLevel) + '☆'.repeat(5 - character.affinityLevel);

  // 决定显示什么气泡文字
  const bubbleText = isActionActive && actionDialogue ? actionDialogue : isHovering && hoverReaction ? hoverReaction : '';

  return (
    <div
      ref={characterRef}
      className={`character-container${isDragging ? ' dragging' : ''}${chatOpen ? ' chat-mode' : ''}${isHovering ? ' hovering' : ''}`}
      style={{
        left: chatOpen ? '50%' : position.x,
        top: chatOpen ? 10 : position.y,
        transform: chatOpen ? 'translateX(-50%) scale(0.55)' : undefined,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDblClick}
      onContextMenu={onContextMenu}
    >
      {/* 情绪气泡 */}
      <div className="emotion-bubble">{emoji}</div>

      {/* 动作气泡 */}
      {bubbleText && (
        <div className="action-bubble">
          <span>{bubbleText}</span>
        </div>
      )}

      {/* 角色图片 */}
      <div className={`character-image-wrapper ${emotionClass} ${isActionActive && currentAction ? currentAction.animationClass : ''}`}>
        <img
          src={`/characters/${character.id}.png`}
          alt={character.nameCN}
          className="character-image"
          draggable={false}
        />

        {/* 眼球跟随效果 */}
        <div className="eye-tracking-overlay">
          <div className="eye-left" style={{ transform: `translate(${eyePosition.x}px, ${eyePosition.y}px)` }} />
          <div className="eye-right" style={{ transform: `translate(${eyePosition.x}px, ${eyePosition.y}px)` }} />
        </div>
      </div>

      <div className="character-name">{character.nameCN}</div>
      <div className="affinity-stars">{stars}</div>
    </div>
  );
}
