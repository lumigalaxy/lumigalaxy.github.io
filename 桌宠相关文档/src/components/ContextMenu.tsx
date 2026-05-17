import { useEffect, useRef } from 'react';
import type { CharacterState } from '../types';

export interface ContextMenuAction {
  id: string;
  label: string;
  icon: string;
  section?: string;
}

interface ContextMenuProps {
  character: CharacterState;
  x: number;
  y: number;
  visible: boolean;
  onAction: (actionId: string) => void;
  onClose: () => void;
}

const menuSections: { header: string; actions: ContextMenuAction[] }[] = [
  {
    header: '互动',
    actions: [
      { id: 'pat_head', label: '摸头', icon: '🤚' },
      { id: 'feed', label: '喂食', icon: '🍱' },
      { id: 'change_outfit', label: '换装', icon: '👗' },
    ],
  },
  {
    header: '小游戏',
    actions: [
      { id: 'pet_challenge', label: '摸头挑战', icon: '✋' },
      { id: 'rock_paper_scissors', label: '猜拳大作战', icon: '✊' },
      { id: 'memory_game', label: '记忆翻牌', icon: '🃏' },
    ],
  },
  {
    header: '其他',
    actions: [
      { id: 'check_status', label: '查看状态', icon: '📊' },
      { id: 'settings', label: '设置', icon: '⚙️' },
    ],
  },
];

const allActions = menuSections.flatMap(s => s.actions);

export default function ContextMenu({
  character,
  x,
  y,
  visible,
  onAction,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  const menuWidth = 180;
  const menuHeight = allActions.length * 36 + menuSections.length * 30;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 10);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <div className="context-menu-header">
        <span>{character.nameCN}</span>
      </div>
      {menuSections.map((section, si) => (
        <div key={section.header}>
          {si > 0 && <div className="context-menu-divider" />}
          <div className="context-menu-section-header">{section.header}</div>
          {section.actions.map((action) => (
            <div
              key={action.id}
              className="context-menu-item"
              onClick={() => {
                onAction(action.id);
                onClose();
              }}
            >
              <span className="context-menu-icon">{action.icon}</span>
              <span className="context-menu-label">{action.label}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
