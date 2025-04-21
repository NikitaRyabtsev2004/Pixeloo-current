import React, { useState } from 'react';

const AdminPanel = () => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    if (password === 'admin123') {
      setIsAuthenticated(true);
    } else {
      alert('Неверный пароль');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <h1>Вход в админ-панель</h1>
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={handleLogin}>Войти</button>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <h1>Админ-панель</h1>
    </div>
  );
};

export default AdminPanel;
