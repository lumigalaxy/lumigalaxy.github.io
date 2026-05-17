import type { CharacterState, TimePeriod } from '../types';
import { getEmotionEmoji } from '../hooks/useEmotionSystem';
import { getAffinityLevelName } from '../hooks/useAffinity';

interface StatusBarProps {
  character: CharacterState;
  timePeriod: TimePeriod;
}

export default function StatusBar({ character, timePeriod }: StatusBarProps) {
  const emoji = getEmotionEmoji(character.emotion);
  const levelName = getAffinityLevelName(character.affinityLevel);

  return (
    <div className="status-bar">
      <div className="status-item">
        <span className="status-emoji">{emoji}</span>
        <span className="status-text">{character.nameCN}</span>
      </div>
      <div className="status-divider" />
      <div className="status-item">
        <span className="status-label">好感</span>
        <span className="status-value">Lv.{character.affinityLevel} {levelName}</span>
      </div>
      <div className="status-divider" />
      <div className="status-item">
        <span className="status-label">时段</span>
        <span className="status-value">{timePeriod.name}</span>
      </div>
    </div>
  );
}
