import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, CharacterState } from '../types';
import { getEmotionEmoji } from '../hooks/useEmotionSystem';

interface ChatWindowProps {
  character: CharacterState;
  messages: ChatMessage[];
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (message: string) => void;
}

export default function ChatWindow({
  character,
  messages,
  isOpen,
  onClose,
  onSendMessage,
}: ChatWindowProps) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    onSendMessage(text);
    setInput('');
    setIsTyping(true);
    // Simulate typing delay
    setTimeout(() => {
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  }, [input, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  if (!isOpen) return null;

  const getAvatar = () => {
    // 5 新角色头像：assets 待补，先按 id 拼路径，缺失时由 onError 兜底
    return `/characters/${character.id}.png`;
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-header-info">
          <img src={getAvatar()} alt="" className="chat-avatar" />
          <span className="chat-header-name">{character.nameCN}</span>
          <span className="chat-header-emoji">{getEmotionEmoji(character.emotion)}</span>
        </div>
        <button className="chat-close-btn" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message chat-message-${msg.role}`}>
            {msg.role === 'character' && (
              <img src={getAvatar()} alt="" className="chat-msg-avatar" />
            )}
            <div className="chat-message-content">
              {msg.role === 'character' && (
                <span className="chat-msg-name">{character.nameCN}</span>
              )}
              <div className="chat-bubble">{msg.content}</div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="chat-message chat-message-character">
            <img src={getAvatar()} alt="" className="chat-msg-avatar" />
            <div className="chat-message-content">
              <span className="chat-msg-name">{character.nameCN}</span>
              <div className="chat-bubble chat-typing">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
        />
        <button className="chat-send-btn" onClick={handleSend} disabled={!input.trim()}>
          发送
        </button>
      </div>
    </div>
  );
}
