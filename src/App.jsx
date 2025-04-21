import React, { useEffect, Suspense, lazy, useState } from 'react';
import './styles/App.css';
import './styles/loading.css';
import './styles/PixelooIntro.css';
import Logo from './components/pages/AuthPage.jsx';
import RulesModal from './components/modal/RulesModal.jsx';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuthStatus } from './redux/slices/authSlice';
import { closeModal, checkAutoOpen } from './redux/slices/rulesModalSlice';
import Intro from './components/ui/Intro/Intro.jsx';
import AdminPanel from './Admin/AdminPanel.jsx';
import NotificationModal from './components/modal/NotificationModal.jsx';

const Canvas = lazy(() => import('./components/pages/Canvas'));

const App = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { isOpen } = useSelector((state) => state.rulesModal);
  const [isIntro, setIsIntro] = useState(() => {
    const savedValue = localStorage.getItem('intro');
    return savedValue ? savedValue === 'true' : true;
  });
  const [isSounds, setIsSounds] = useState(() => {
    const savedValue = localStorage.getItem('sounds');
    return savedValue ? savedValue === 'true' : true;
  });
  const [isHudOpacity, setIsHudOpacity] = useState(() => {
    const savedValue = localStorage.getItem('HUDOpacity');
    return savedValue !== null ? parseInt(savedValue, 10) : 50;
  });

  useEffect(() => {
    dispatch(checkAuthStatus());
    dispatch(checkAutoOpen());

    if (window.location.pathname === '/') {
      const randomCanvasNumber = Math.floor(Math.random() * 3) + 1;
      navigate(`/canvas-${randomCanvasNumber}`);
    }
  }, [dispatch, navigate]);

  const canvasFallback = (
    <div className="loader-container">
      <div className="spinner"></div>
      <p>Загрузка игры, пожалуйста, подождите...</p>
    </div>
  );

  useEffect(() => {
    localStorage.setItem('intro', isIntro.toString());
    localStorage.setItem('sounds', isSounds.toString());
    localStorage.setItem('HUDOpacity', isHudOpacity.toString());
  }, [isIntro, isSounds, isHudOpacity]);

  useEffect(() => {
    if (localStorage.getItem('HUD') === null) {
      localStorage.setItem('HUD', 'true');
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'intro') {
        setIsIntro(event.newValue === 'true');
      }
      if (event.key === 'sounds') {
        setIsIntro(event.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <div className="App">
      {isIntro ? <Intro /> : null}
      <Logo />
      <NotificationModal />
      {isOpen && <RulesModal onClose={() => dispatch(closeModal())} />}
      {/* Suspense for lazy loading */}
      <Suspense fallback={canvasFallback}>
        <Routes>
          <Route
            path="/canvas-1"
            element={<Canvas isAuthenticated={isAuthenticated} />}
          />
          <Route
            path="/canvas-2"
            element={<Canvas isAuthenticated={isAuthenticated} />}
          />
          <Route
            path="/canvas-3"
            element={<Canvas isAuthenticated={isAuthenticated} />}
          />
          <Route
            path="/single-player-game"
            element={<Canvas isAuthenticated={isAuthenticated} />}
          />
  
          <Route
            path="/battle/:gameId"
            element={<Canvas isAuthenticated={isAuthenticated} />}
          />

          {/* dev */}
          {/* dev */}
          {/* dev */}

          {/* <Route
            path="/ai"
            element={<ImageClassifier/>}
          /> */}

          {/* dev */}
          {/* dev */}
          {/* dev */}

          <Route path="/pixeloo-admin" element={<AdminPanel />} />
        </Routes>
      </Suspense>
    </div>
  );
};

const AppWrapper = () => (
  <Router>
    <App />
  </Router>
);

export default AppWrapper;
