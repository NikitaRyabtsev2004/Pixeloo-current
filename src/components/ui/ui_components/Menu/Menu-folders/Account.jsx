import React, { useEffect, useState } from 'react';
import { API_URL } from '../../../../../utils/helpers/constants';

const Account = ({ onBack, socket }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [passwordResetMode, setPasswordResetMode] = useState(false);
  const [usernameChangeMode, setUsernameChangeMode] = useState(false);
  const [emailChangeMode, setEmailChangeMode] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [newEmailConfirmationCode, setNewEmailConfirmationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [timer, setTimer] = useState(30);
  const [isDisabled, setIsDisabled] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [emailUpdatePhase, setEmailUpdatePhase] = useState(1);

  useEffect(() => {
    if (!socket) return;

    socket.emit('get-username-data');

    const handleUsernameData = (data) => {
      if (data.success) {
        setUsername(data.username);
        setEmail(data.email);
      } else {
        console.error('Ошибка получения данных:', data.error);
      }
    };

    socket.on('username-data', handleUsernameData);

    return () => {
      socket.off('username-data', handleUsernameData);
    };
  }, [socket]);

  useEffect(() => {
    if (isDisabled) {
      const interval = setInterval(() => {
        setTimer((prevTimer) => {
          if (prevTimer === 1) {
            clearInterval(interval);
            setIsDisabled(false);
          }
          return prevTimer - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isDisabled]);

  const handleSendCode = async (operation) => {
    setIsDisabled(true);
    setTimer(30);
    try {
      const response = await fetch(`${API_URL}/srv/auth/reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailChangeMode && emailUpdatePhase === 2 ? newEmail : email, operation }),
      });
      const result = await response.json();
      if (response.ok) {
        setStatusMessage('Код отправлен на вашу почту');
        setCodeSent(true);
      } else {
        setStatusMessage(result.message || 'Ошибка отправки кода');
      }
    } catch (error) {
      setStatusMessage('Ошибка соединения');
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setStatusMessage('Пароли не совпадают');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/srv/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          confirmationCode,
          newPassword,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        setStatusMessage('Пароль успешно изменен');
        resetPasswordForm();
      } else {
        setStatusMessage(result.message || 'Ошибка смены пароля');
      }
    } catch (error) {
      setStatusMessage('Ошибка соединения');
    }
  };

  const handleUpdateUsername = async () => {
    try {
      const response = await fetch(`${API_URL}/srv/auth/update-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          confirmationCode,
          newUsername,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        setStatusMessage('Никнейм успешно изменен');
        setUsername(newUsername);
        resetUsernameForm();
      } else {
        setStatusMessage(result.message);
      }
    } catch (error) {
      setStatusMessage('Ошибка соединения');
    }
  };

  const handleUpdateEmail = async () => {
    try {
      const response = await fetch(`${API_URL}/srv/auth/update-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldEmail: email,
          newEmail,
          confirmationCode: emailUpdatePhase === 1 ? confirmationCode : undefined,
          newEmailConfirmationCode: emailUpdatePhase === 2 ? newEmailConfirmationCode : undefined,
          phase: emailUpdatePhase,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        if (emailUpdatePhase === 1) {
          setEmailUpdatePhase(2);
          setConfirmationCode('');
          setStatusMessage('Код отправлен на новую почту');
        } else {
          setStatusMessage('Почта успешно изменена');
          setEmail(newEmail);
          resetEmailForm();
        }
      } else {
        setStatusMessage(result.message);
      }
    } catch (error) {
      setStatusMessage('Ошибка соединения');
    }
  };

  const resetPasswordForm = () => {
    setPasswordResetMode(false);
    setCodeSent(false);
    setConfirmationCode('');
    setNewPassword('');
    setConfirmPassword('');
    setStatusMessage('');
  };

  const resetUsernameForm = () => {
    setUsernameChangeMode(false);
    setCodeSent(false);
    setConfirmationCode('');
    setNewUsername('');
    setStatusMessage('');
  };

  const resetEmailForm = () => {
    setEmailChangeMode(false);
    setCodeSent(false);
    setConfirmationCode('');
    setNewEmailConfirmationCode('');
    setNewEmail('');
    setStatusMessage('');
    setEmailUpdatePhase(1);
  };

  return (
    <div>
      <h3 className="Menu__logo">Account</h3>

      {!passwordResetMode && !usernameChangeMode && !emailChangeMode ? (
        <>
          {isOpen ? null : (
            <>
              <div className="Account-data">
                <div className="Account-username">
                  <p>Никнейм:</p>
                  <p>{username || 'Загрузка...'}</p>
                </div>
                <div className="Account-email">
                  <p>Почта:</p> <p>{email || 'Загрузка...'}</p>
                </div>
                <button onClick={() => setIsOpen(!isOpen)}>
                  {isOpen ? 'Назад' : 'Редактировать аккаунт'}
                </button>
              </div>
            </>
          )}
          {isOpen && (
            <div className='Account-edit-menu'>
              <button onClick={() => setUsernameChangeMode(true)}>
                Сменить никнейм
              </button>
              <button onClick={() => setPasswordResetMode(true)}>
                Сменить пароль
              </button>
              <button onClick={() => setEmailChangeMode(true)}>
                Сменить почту
              </button>
            </div>
          )}
          <div className="menu__switch__buttons">
            <button onClick={onBack}>Назад</button>
          </div>
        </>
      ) : passwordResetMode ? (
        <div className='Password-change__container'>
          <h3>Смена пароля</h3>
          {!codeSent ? (
            <>
              <p>Код будет отправлен на почту: {email}</p>
              <button onClick={() => handleSendCode('password-reset')} disabled={isDisabled}>
                {isDisabled ? `Отправить код (${timer})` : 'Отправить код'}
              </button>
              <button onClick={resetPasswordForm}>Отмена</button>
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="Код подтверждения"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
              />
              <input
                type="password"
                placeholder="Новый пароль"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <input
                type="password"
                placeholder="Подтвердите пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button onClick={handleResetPassword}>Сменить пароль</button>
              <button onClick={resetPasswordForm}>Отмена</button>
            </>
          )}
          {statusMessage && <p>{statusMessage}</p>}
        </div>
      ) : usernameChangeMode ? (
        <div className='Username-change__container'>
          <h3>Смена никнейма</h3>
          {!codeSent ? (
            <>
              <p>Код будет отправлен на почту: {email}</p>
              <button onClick={() => handleSendCode('username-change')} disabled={isDisabled}>
                {isDisabled ? `Отправить код (${timer})` : 'Отправить код'}
              </button>
              <button onClick={resetUsernameForm}>Отмена</button>
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="Код подтверждения"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
              />
              <input
                type="text"
                placeholder="Новый никнейм"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
              <button onClick={handleUpdateUsername}>Сменить никнейм</button>
              <button onClick={resetUsernameForm}>Отмена</button>
            </>
          )}
          {statusMessage && <p>{statusMessage}</p>}
        </div>
      ) : emailChangeMode ? (
        <div className='Email-change__container'>
          <h3>Смена почты</h3>
          {emailUpdatePhase === 1 ? (
            <>
              <p>Код будет отправлен на текущую почту: {email}</p>
              <button onClick={() => handleSendCode('email-change')} disabled={isDisabled}>
                {isDisabled ? `Отправить код (${timer})` : 'Отправить код'}
              </button>
              {codeSent && (
                <>
                  <input
                    type="text"
                    placeholder="Код подтверждения для текущей почты"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                  />
                  <input
                    type="email"
                    placeholder="Новая почта"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`${API_URL}/srv/auth/reset-code`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: newEmail, operation: 'email-change-new' }),
                        });
                        const result = await response.json();
                        if (response.ok) {
                          // Store the new email confirmation code
                          await fetch(`${API_URL}/srv/auth/update-email`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              oldEmail: email,
                              newEmail,
                              confirmationCode,
                              newEmailConfirmationCode: result.confirmationCode, // Assuming the server returns the code
                              phase: 1,
                            }),
                          });
                          setEmailUpdatePhase(2);
                          setConfirmationCode('');
                          setStatusMessage('Код отправлен на новую почту');
                        } else {
                          setStatusMessage(result.message || 'Ошибка отправки кода');
                        }
                      } catch (error) {
                        setStatusMessage('Ошибка соединения');
                      }
                    }}
                  >
                    Подтвердить новую почту
                  </button>
                </>
              )}
              <button onClick={resetEmailForm}>Отмена</button>
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="Код подтверждения для новой почты"
                value={newEmailConfirmationCode}
                onChange={(e) => setNewEmailConfirmationCode(e.target.value)}
              />
              <button onClick={handleUpdateEmail}>Подтвердить смену почты</button>
              <button onClick={resetEmailForm}>Отмена</button>
            </>
          )}
          {statusMessage && <p>{statusMessage}</p>}
        </div>
      ) : null}
    </div>
  );
};

export default Account;