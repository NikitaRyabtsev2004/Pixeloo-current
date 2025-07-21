import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useNotifications } from '../../utils/helpers/notifications';
import { useSettings } from '../../hooks/useSettings';
import { playSound } from '../../utils/functions/sounds/sounds';

const Chat = ({ socket, isAuthenticated, uniqueIdentifier}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const { showAuthenticationRequiredNotification } = useNotifications();
  const { isSoundsOn } = useSettings();

  const MAX_MESSAGE_LENGTH = 110;

  const checkIfAtBottom = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      return scrollHeight - scrollTop - clientHeight <= 10;
    }
    return true;
  };

  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    socket.emit('get-messages');

    socket.on('chat-messages', (data) => {
      setMessages(data.messages);
    });

    socket.on('new-message', (message) => {
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages, message].slice(-200);
        return updatedMessages;
      });
    });

    return () => {
      socket.off('chat-messages');
      socket.off('new-message');
    };
  }, [socket, isAuthenticated]);

  useEffect(() => {
    const handleScroll = () => {
      setIsAtBottom(checkIfAtBottom());
    };

    const messagesContainer = messagesContainerRef.current;
    if (messagesContainer) {
      messagesContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (messagesContainer) {
        messagesContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAtBottom]);

  const handleSendMessage = () => {
    if (!isAuthenticated) {
      showAuthenticationRequiredNotification();
      return;
    }
    if (message.trim() === '' || !socket) return;

    const messageData = {
      content: message.trim(),
      uniqueIdentifier,
      replyTo: replyTo ? { id: replyTo.id, username: replyTo.username } : null,
    };

    socket.emit('send-message', messageData, (response) => {
      if (response.success) {
        setMessage('');
        setReplyTo(null);
        setIsAtBottom(true);
        playSound(0.5, 'login.mp3', isSoundsOn);
      } else {
        console.error('Failed to send message:', response.message);
      }
    });
  };

  const handleReply = (message) => {
    if (!isAuthenticated) {
      showAuthenticationRequiredNotification();
      return;
    }
    setReplyTo({ id: message.id, username: message.username });
    setMessage(`@${message.username} `);
  };

  const handleInputChange = (e) => {
    const input = e.target.value;
    if (input.length <= MAX_MESSAGE_LENGTH) {
      setMessage(input);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleChatOpen = () => {
    if (!isChatOpen) {
      playSound(0.5, 'to.mp3', isSoundsOn);
    } else {
      playSound(0.5, 'out.mp3', isSoundsOn);
    }
    setIsChatOpen(!isChatOpen)
  }

  const handleChatClose = () => {
    playSound(0.5, 'out.mp3', isSoundsOn);
    setIsChatOpen(false)
  }

  return (
    <>
      <button
        className="chat-toggle-button"
        onClick={() => handleChatOpen()}
      >
        {isChatOpen ? 'Закрыть' : 'Чат'}
      </button>
      <div
        className={`chat-container ${isChatOpen ? 'chat-container-open' : 'chat-container-closed'}`}
      >
        <div className="chat-header">
          <h2 className="chat-title">Чат</h2>
          <button
            className="chat-close-button"
            onClick={() => handleChatClose()}
          >
            ✕
          </button>
        </div>
        <div className="chat-messages" ref={messagesContainerRef}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="chat-message"
              onClick={() => handleReply(msg)}
            >
              {msg.replyTo && (
                <div className="chat-message-reply">
                  Ответ на @{msg.replyTo.username}
                </div>
              )}
              <div className="chat-message-content">
                <span className="chat-message-username">{msg.username}</span>
                <span className="chat-message-text">{msg.content}</span>
              </div>
              <div className="chat-message-timestamp">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {isAuthenticated && (
          <div className="chat-input-container">
            {replyTo && (
              <div className="chat-reply-info">
                Ответ на @{replyTo.username}
                <button
                  className="chat-reply-cancel"
                  onClick={() => setReplyTo(null)}
                >
                  ✕
                </button>
              </div>
            )}
            <div className="chat-input-wrapper">
              <textarea
                className="chat-input"
                value={message}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Введите сообщение..."
                rows="3"
              />
              <button
                className="chat-send-button"
                onClick={handleSendMessage}
              >
                Отправить
              </button>
            </div>
            <div className="chat-char-count">
              {message.length}/{MAX_MESSAGE_LENGTH} символов
            </div>
          </div>
        )}
      </div>
    </>
  );
};

Chat.propTypes = {
  socket: PropTypes.object.isRequired,
  isAuthenticated: PropTypes.bool.isRequired,
  uniqueIdentifier: PropTypes.string,
};

export default Chat;