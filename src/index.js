import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import App from './App.jsx';
import 'core-js/stable';
import 'regenerator-runtime/runtime';

// if (process.env.NODE_ENV === 'production') {
//   console.log = () => {};
//   console.warn = () => {};
//   console.error = () => {};
//   console.info = () => {};
//   console.debug = () => {};
// } else {
//   window.onerror = function (message, source, lineno, colno, error) {
//     console.error('Global error caught:', {
//       message,
//       source,
//       lineno,
//       colno,
//       error,
//     });
//     return false;
//   };

//   window.onunhandledrejection = function (event) {
//     console.error('Unhandled promise rejection:', event.reason);
//     event.preventDefault();
//   };
// }

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <Provider store={store}>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </Provider>
);
