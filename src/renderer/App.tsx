import React, { useState, useEffect } from 'react';
import TitleBar from './components/TitleBar';
import UIDemo from './components/UIDemo';
import FileInputInterface from './components/FileInputInterface';
import { Button } from './components/ui';
import { MediaFileInfo } from '../types/services';
import './styles/App.css';

const App: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<MediaFileInfo[]>([]);

  useEffect(() => {
    // Listen for window maximize/restore events
    if (window.electronAPI?.window?.onMaximized) {
      window.electronAPI.window.onMaximized((maximized: boolean) => {
        setIsMaximized(maximized);
      });
    }
  }, []);

  const handleFilesChange = (files: MediaFileInfo[]) => {
    setSelectedFiles(files);
    console.log('Selected files updated:', files);
  };

  return (
    <div className="app">
      <TitleBar isMaximized={isMaximized} />
      <main className="app-content">
        {showDemo ? (
          <div style={{ height: '100%', overflow: 'auto' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)' }}>
              <Button variant="outline" onClick={() => setShowDemo(false)}>
                ← Back to Main App
              </Button>
            </div>
            <UIDemo />
          </div>
        ) : (
          <div className="main-interface">
            <div className="interface-header">
              <h1>FFmpeg Frontend</h1>
              <p>Select your media files to get started with conversion and processing</p>
              <div className="header-actions">
                <Button variant="ghost" onClick={() => setShowDemo(true)}>
                  View UI Demo
                </Button>
              </div>
            </div>

            <div className="interface-content">
              <FileInputInterface
                onFilesChange={handleFilesChange}
                maxFiles={10}
                className="file-input-section"
              />

              {selectedFiles.length > 0 && (
                <div className="next-steps">
                  <p className="next-steps-text">
                    Great! You've selected {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}.
                    The next step will be to configure output settings and processing options.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
