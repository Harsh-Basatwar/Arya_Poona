import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../services/api';
import { formatTime } from '../utils/helpers';
import '../styles/Chatbot.css';

/* ---------- Icons ---------- */
const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const BotAvatar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="9" cy="16" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="15" cy="16" r="1.5" fill="currentColor" stroke="none" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    <line x1="12" y1="4" x2="12" y2="2" />
    <circle cx="12" cy="2" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const QUICK_ACTIONS = [
  'Show all reports',
  'Latest threat model',
  'Reports from today',
  'Help',
];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'bot',
      text: "Hi! 👋 I'm your AI Security assistant. Ask me about reports — I can list, search, or help you generate them.",
      time: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isOpen]);

  async function handleSend(text) {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: messageText,
      time: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const data = await sendChatMessage(messageText);
      const botMsg = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        text: data.reply,
        reports: data.reports || null,
        time: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = {
        id: `bot-err-${Date.now()}`,
        type: 'bot',
        text: "I'm having trouble connecting to the server. Please make sure the backend is running.",
        time: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div className="chatbot__panel" id="chatbot-panel">
          {/* Header */}
          <div className="chatbot__header">
            <div className="chatbot__header-avatar">
              <BotAvatar />
            </div>
            <div className="chatbot__header-info">
              <div className="chatbot__header-title">Security Assistant</div>
              <div className="chatbot__header-status">Online</div>
            </div>
            <button
              className="chatbot__header-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Messages */}
          <div className="chatbot__messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chatbot__message chatbot__message--${msg.type}`}>
                <div className="chatbot__message-bubble">
                  {msg.text}
                  {/* Report list in bot message */}
                  {msg.reports && msg.reports.length > 0 && (
                    <div className="chatbot__report-list">
                      {msg.reports.map((report) => (
                        <div key={report.report_id} className="chatbot__report-item">
                          <span className="chatbot__report-item-name">{report.title}</span>
                          <span className="chatbot__report-item-date">
                            {formatTime(report.generated_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="chatbot__message-time">{formatTime(msg.time)}</div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="chatbot__typing">
                <span className="chatbot__typing-dot" />
                <span className="chatbot__typing-dot" />
                <span className="chatbot__typing-dot" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="chatbot__quick-actions">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                className="chatbot__quick-btn"
                onClick={() => handleSend(action)}
              >
                {action}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="chatbot__input-area">
            <input
              ref={inputRef}
              className="chatbot__input"
              placeholder="Ask about reports…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              id="chatbot-input"
            />
            <button
              className="chatbot__send"
              onClick={() => handleSend()}
              disabled={!input.trim()}
              aria-label="Send message"
              id="chatbot-send-btn"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        className={`chatbot__fab ${isOpen ? 'chatbot__fab--open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        id="chatbot-fab"
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
      </button>
    </>
  );
}
