import React, { useState, useEffect } from 'react';
import TitleBar from './components/TitleBar';
import './styles/App.css';

const App: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Listen for window maximize/restore events
    if (window.electronAPI?.window?.onMaximized) {
      window.electronAPI.window.onMaximized((maximized: boolean) => {
        setIsMaximized(maximized);
      });
    }
  }, []);

  return (
    <div className="app">
      <TitleBar isMaximized={isMaximized} />
      <main className="app-content">
        <div className="welcome-container">
          <h1>FFmpeg Frontend</h1>
          <p>A user-friendly desktop application for FFmpeg operations</p>
          <div className="status-info">
            <p>Application initialized successfully</p>
            <p>Ready for FFmpeg integration</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
