// 猜拳大作战小游戏组件
import { useCallback } from 'react';
import { useRockPaperScissors, Choice } from '../../hooks/useMiniGames';

interface RockPaperScissorsProps {
  characterName: string;
  onComplete: (affinityGain: number) => void;
  onClose: () => void;
}

export default function RockPaperScissors({ characterName, onComplete, onClose }: RockPaperScissorsProps) {
  const game = useRockPaperScissors();

  const handleChoice = useCallback((choice: Choice) => {
    game.makeChoice(choice);
  }, [game]);

  const handleComplete = useCallback(() => {
    const gain = game.getAffinityGain();
    onComplete(gain);
    game.closeGame();
  }, [game, onComplete]);

  if (!game.isPlaying && !game.showResult) {
    return (
      <div className="mini-game-overlay" onClick={onClose}>
        <div className="mini-game-panel rps-game-panel" onClick={e => e.stopPropagation()}>
          <div className="mini-game-header">
            <span className="mini-game-title">✊ 猜拳大作战</span>
            <button className="mini-game-close" onClick={onClose}>✕</button>
          </div>
          <div className="mini-game-body">
            <div className="rps-game-intro">
              <div className="rps-game-emoji">✊✋✌️</div>
              <p>和{characterName}来一场猜拳对决！</p>
              <p className="rps-game-rule">五局三胜，准备好了吗？</p>
            </div>
            <button className="mini-game-start-btn" onClick={game.startGame}>
              开始对决！
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (game.showResult) {
    const resultConfig: Record<string, { emoji: string; text: string; color: string }> = {
      win: { emoji: '🏆', text: '你赢了！', color: '#ffd700' },
      lose: { emoji: '😢', text: '你输了...', color: '#ff6b6b' },
      draw: { emoji: '🤝', text: '平局！', color: '#64b5f6' },
    };
    const config = resultConfig[game.finalResult] || resultConfig.draw;

    return (
      <div className="mini-game-overlay">
        <div className="mini-game-panel rps-game-panel">
          <div className="mini-game-header">
            <span className="mini-game-title">✊ 猜拳大作战</span>
          </div>
          <div className="mini-game-body">
            <div className="rps-game-result">
              <div className="rps-result-emoji">{config.emoji}</div>
              <div className="rps-result-text" style={{ color: config.color }}>{config.text}</div>
              <div className="rps-result-score">
                <span>你 {game.playerScore} : {game.characterScore} {characterName}</span>
              </div>
              <div className="rps-result-affinity">好感度 +{game.getAffinityGain()}</div>
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
  return (
    <div className="mini-game-overlay">
      <div className="mini-game-panel rps-game-panel">
        <div className="mini-game-header">
          <span className="mini-game-title">✊ 猜拳大作战</span>
          <span className="rps-round-info">第 {game.round + 1}/{game.totalRounds} 局</span>
        </div>
        <div className="mini-game-body">
          {/* 比分 */}
          <div className="rps-scoreboard">
            <div className="rps-player-score">
              <span className="rps-score-label">你</span>
              <span className="rps-score-num">{game.playerScore}</span>
            </div>
            <div className="rps-vs">VS</div>
            <div className="rps-player-score">
              <span className="rps-score-label">{characterName}</span>
              <span className="rps-score-num">{game.characterScore}</span>
            </div>
          </div>

          {/* 当前回合结果 */}
          {game.currentRound && (
            <div className="rps-round-result">
              <div className="rps-choice-display">
                <span className="rps-choice-emoji">{game.CHOICE_EMOJI[game.currentRound.playerChoice]}</span>
                <span className="rps-choice-vs">VS</span>
                <span className={`rps-choice-emoji ${game.isRevealing ? 'revealed' : ''}`}>
                  {game.isRevealing ? game.CHOICE_EMOJI[game.currentRound.characterChoice] : '❓'}
                </span>
              </div>
              {game.isRevealing && (
                <div className={`rps-round-text ${game.currentRound.result}`}>
                  {game.currentRound.result === 'win' ? '你赢了！' :
                   game.currentRound.result === 'lose' ? '你输了...' : '平局！'}
                </div>
              )}
            </div>
          )}

          {/* 角色对话 */}
          <div className="rps-dialogue">{game.characterDialogue}</div>

          {/* 出拳按钮 */}
          {!game.isRevealing && (
            <div className="rps-choices">
              {(['rock', 'paper', 'scissors'] as Choice[]).map(choice => (
                <button
                  key={choice}
                  className="rps-choice-btn"
                  onClick={() => handleChoice(choice)}
                >
                  <span className="rps-choice-emoji">{game.CHOICE_EMOJI[choice]}</span>
                  <span className="rps-choice-name">{game.CHOICE_NAME[choice]}</span>
                </button>
              ))}
            </div>
          )}

          {/* 历史记录 */}
          {game.history.length > 0 && (
            <div className="rps-history">
              {game.history.map((round: { playerChoice: Choice; characterChoice: Choice; result: string }, i: number) => (
                <span key={i} className={`rps-history-item ${round.result}`}>
                  {game.CHOICE_EMOJI[round.playerChoice]}{game.CHOICE_EMOJI[round.characterChoice]}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
