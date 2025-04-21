import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  loginSuccess,
  setAuthStatus,
  toggleResetPasswordFlow,
} from '../../redux/slices/authSlice';
import { AUTH_MESSAGES, API_URL } from '../../utils/helpers/constants';
import PropTypes from 'prop-types';
import { useSettings } from '../../hooks/useSettings';

const AuthModal = ({ onClose }) => {
  const dispatch = useDispatch();
  const { resetPasswordFlow, authStatus } = useSelector((state) => state.auth);
  const [isRegister, setIsRegister] = useState(true);
  const [isVerification, setIsVerification] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    usernameOrEmail: '',
    username: '',
    password: '',
    confirmPassword: '',
    confirmationCode: '',
  });
  // eslint-disable-next-line
  const [timer, setTimer] = useState(30);
  const [isDisabled, setIsDisabled] = useState(false);
  const [statusTimer, setStatusTimer] = useState(5);
  const { isHudOpen, isSoundsOn } = useSettings();

  useEffect(() => {
    if (authStatus) {
      setStatusTimer(5);
      const interval = setInterval(() => {
        setStatusTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            dispatch(setAuthStatus(''));
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [authStatus, dispatch]);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (resetPasswordFlow) {
      if (isVerification) {
        await resetPassword();
      } else {
        await sendResetCode();
      }
    } else if (isVerification) {
      await verifyAccount();
    } else if (isRegister) {
      await registerAccount();
    } else {
      await loginAccount();
    }
  };

  const loginAccount = async () => {
    try {
      const response = await fetch(`${API_URL}/srv/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernameOrEmail: formData.usernameOrEmail,
          password: formData.password,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        dispatch(loginSuccess({ user: result, isSoundsOn }));
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('uniqueIdentifier', result.uniqueIdentifier);
        dispatch(setAuthStatus(AUTH_MESSAGES.loginSuccess));
        onClose();
      } else {
        dispatch(setAuthStatus(result.message || AUTH_MESSAGES.errorGeneric));
      }
    } catch (error) {
      dispatch(setAuthStatus(AUTH_MESSAGES.errorGeneric));
    }
  };
  

  const registerAccount = async () => {
    try {
      const response = await fetch(`${API_URL}/srv/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });
      const result = await response.json();
      dispatch(setAuthStatus(result.message || AUTH_MESSAGES.errorGeneric));
      if (response.ok && result.needVerification) {
        setIsVerification(true);
        setFormData((prev) => ({
          ...prev,
          confirmationCode: '',
          password: '',
          confirmPassword: '',
        }));
      }
    } catch (error) {
      dispatch(setAuthStatus(AUTH_MESSAGES.errorGeneric));
    }
  };

  const verifyAccount = async () => {
    try {
      const response = await fetch(`${API_URL}/srv/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          confirmationCode: formData.confirmationCode,
        }),
      });
      const result = await response.json();
      dispatch(setAuthStatus(result.message || AUTH_MESSAGES.errorGeneric));
      if (response.ok) {
        setIsVerification(false);
        setIsRegister(false);
        dispatch(setAuthStatus(AUTH_MESSAGES.registrationSuccess));
      }
    } catch (error) {
      dispatch(setAuthStatus(AUTH_MESSAGES.errorGeneric));
    }
  };

  const sendResetCode = async () => {
    setIsDisabled(true);
    setTimer(30);
    try {
      const response = await fetch(`${API_URL}/srv/auth/reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      const result = await response.json();
      if (response.ok) {
        setIsVerification(true);
        setFormData((prev) => ({
          ...prev,
          confirmationCode: '',
        }));
      }
      dispatch(setAuthStatus(result.message || AUTH_MESSAGES.errorGeneric));
    } catch (error) {
      dispatch(setAuthStatus(AUTH_MESSAGES.errorGeneric));
    }
  };

  const resetPassword = async () => {
    if (formData.password !== formData.confirmPassword) {
      dispatch(setAuthStatus(AUTH_MESSAGES.passwordsDoNotMatch));
      return;
    }
    try {
      const response = await fetch(`${API_URL}/srv/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          confirmationCode: formData.confirmationCode,
          newPassword: formData.password,
        }),
      });
      const result = await response.json();
      dispatch(setAuthStatus(result.message || AUTH_MESSAGES.errorGeneric));
      if (response.ok) {
        setIsVerification(false);
        dispatch(toggleResetPasswordFlow(false));
      }
    } catch (error) {
      dispatch(setAuthStatus(AUTH_MESSAGES.errorGeneric));
    }
  };
  

  const handleCancel = () => {
    if (resetPasswordFlow) {
      dispatch(toggleResetPasswordFlow(false));
      setIsRegister(true);
    } else {
      setIsVerification(false);
      setIsRegister(true);
    }
  };

  return (
    <div className="modal">
      <form onSubmit={handleSubmit}>
        <h2>
          {resetPasswordFlow
            ? 'Сброс пароля'
            : isRegister
              ? isVerification
                ? 'Подтверждение'
                : 'Регистрация'
              : 'Вход'}
        </h2>
        {resetPasswordFlow ? (
          !isVerification ? (
            <>
              <input
                type="email"
                inputmode="text"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <button type="submit">Отправить код</button>
              <button type="button" onClick={handleCancel}>
                Отмена
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                inputmode="text"
                name="confirmationCode"
                placeholder="Код подтверждения"
                value={formData.confirmationCode}
                onChange={handleChange}
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Новый пароль"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <input
                type="password"
                inputmode="text"
                name="confirmPassword"
                placeholder="Подтверждение пароля"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              <button type="submit">Сбросить пароль</button>
              <button type="button" onClick={handleCancel}>
                Отмена
              </button>
            </>
          )
        ) : isRegister ? (
          isVerification ? (
            <>
              <input
                type="text"
                inputmode="text"
                name="confirmationCode"
                placeholder="Код подтверждения"
                value={formData.confirmationCode}
                onChange={handleChange}
                required
              />
              <button type="submit">Подтвердить</button>
              <button type="button" onClick={handleCancel}>
                Отмена
              </button>
            </>
          ) : (
            <>
              <input
                type="email"
                inputmode="text"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <input
                type="text"
                inputmode="text"
                name="username"
                placeholder="Имя пользователя"
                value={formData.username}
                onChange={handleChange}
                required
              />
              <input
                type="password"
                inputmode="text"
                name="password"
                placeholder="Пароль"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <input
                type="password"
                inputmode="text"
                name="confirmPassword"
                placeholder="Подтверждение пароля"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              <button type="submit">Зарегистрироваться</button>
              <button type="button" onClick={() => setIsRegister(!isRegister)}>
                {isRegister ? 'Вход' : 'Регистрация'}
              </button>
            </>
          )
        ) : (
          <>
            <input
              type="email"
              inputmode="text"
              name="usernameOrEmail"
              placeholder="Email"
              value={formData.usernameOrEmail}
              onChange={handleChange}
              required
            />
            <input
              type="password"
              inputmode="text"
              name="password"
              placeholder="Пароль"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button type="submit">Войти</button>
            <button
              type="button"
              onClick={() => dispatch(toggleResetPasswordFlow(true))}
            >
              Сброс пароля
            </button>
            <button type="button" onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? 'Вход' : 'Регистрация'}
            </button>
          </>
        )}
        {authStatus && (
          <p>
            {authStatus} {statusTimer > 0 && `[${statusTimer}]`}
          </p>
        )}
      </form>
    </div>
  );
};

AuthModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default AuthModal;
