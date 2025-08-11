import React, { useState, useEffect } from 'react';
import TitleBar from './components/TitleBar';
import UIDemo from './components/UIDemo';
import FileInputInterface from './components/FileInputInterface';
import OutputSettings from './components/OutputSettings';
import FilterPanel from './components/FilterPanel';
import CommandPreview from './components/CommandPreview';
import Button from './components/ui/Button';
import {
  MediaFileInfo,
  OutputSettings as OutputSettingsType,
  FilterConfig,
  FilterDefinition,
  FilterCategory,
  FFmpegCommand,
  GeneratedCommand,
} from '../types/services';
import './styles/App.css';

const App: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<MediaFileInfo[]>([]);
  const [outputSettings, setOutputSettings] = useState<OutputSettingsType>({
    format: 'mp4',
    codec: 'libx264',
    quality: {
      crf: 23,
      preset: 'medium',
    },
    outputPath: '',
  });
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [filterDefinitions, setFilterDefinitions] = useState<FilterDefinition[]>([]);
  const [filterCategories, setFilterCategories] = useState<FilterCategory[]>([]);
  const [generatedCommand, setGeneratedCommand] = useState<GeneratedCommand | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Listen for window maximize/restore events
    if (window.electronAPI?.window?.onMaximized) {
      window.electronAPI.window.onMaximized((maximized: boolean) => {
        setIsMaximized(maximized);
      });
    }

    // Load filter definitions and categories
    loadFilterData();
  }, []);

  // Load filter definitions and categories from main process
  const loadFilterData = async () => {
    try {
      const [definitionsResult, categoriesResult] = await Promise.all([
        window.electronAPI?.filter?.getDefinitions(),
        window.electronAPI?.filter?.getCategories(),
      ]);

      if (definitionsResult?.success) {
        setFilterDefinitions(definitionsResult.data);
      }

      if (categoriesResult?.success) {
        setFilterCategories(categoriesResult.data);
      }
    } catch (error) {
      console.error('Failed to load filter data:', error);
    }
  };

  // Generate FFmpeg command when settings change
  useEffect(() => {
    if (selectedFiles.length > 0 && outputSettings.outputPath) {
      generateCommand();
    }
  }, [selectedFiles, outputSettings, filters]);

  const generateCommand = async () => {
    if (selectedFiles.length === 0 || !outputSettings.outputPath) {
      setGeneratedCommand(null);
      return;
    }

    try {
      const ffmpegCommand: FFmpegCommand = {
        inputFiles: selectedFiles.map(file => file.path),
        outputFile: outputSettings.outputPath,
        videoCodec: outputSettings.codec,
        format: outputSettings.format,
        quality: outputSettings.quality,
        filters: filters,
      };

      const result = await window.electronAPI?.command?.generate(ffmpegCommand, {
        includeProgress: true,
        overwriteOutput: true,
        verboseLogging: false,
      });
      console.log('Generated command:', result);

      if (result?.success) {
        setGeneratedCommand(result.data);
      }
    } catch (error) {
      console.error('Failed to generate command:', error);
    }
  };

  const handleFilesChange = (files: MediaFileInfo[]) => {
    setSelectedFiles(files);
    console.log('Selected files updated:', files);
  };

  const handleOutputSettingsChange = (settings: OutputSettingsType) => {
    setOutputSettings(settings);
    console.log('Output settings updated:', settings);
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
              <div className="interface-grid">
                <FileInputInterface
                  onFilesChange={handleFilesChange}
                  maxFiles={10}
                  className="file-input-section"
                />

                {selectedFiles.length > 0 && (
                  <OutputSettings
                    selectedFiles={selectedFiles}
                    onSettingsChange={handleOutputSettingsChange}
                    className="output-settings-section"
                  />
                )}

                {selectedFiles.length > 0 && (
                  <FilterPanel
                    filters={filters}
                    onFiltersChange={setFilters}
                    availableFilters={filterDefinitions}
                    filterCategories={filterCategories}
                  />
                )}
              </div>

              {selectedFiles.length > 0 && generatedCommand && (
                <div className="command-section">
                  <CommandPreview
                    command={generatedCommand}
                    onCommandEdit={async (editedCommand) => {
                      try {
                        const result = await window.electronAPI?.command?.parse(editedCommand);
                        if (result?.success) {
                          // Update settings based on parsed command
                          console.log('Parsed command:', result.data);
                        }
                      } catch (error) {
                        console.error('Failed to parse edited command:', error);
                      }
                    }}
                    onCopyCommand={() => {
                      console.log('Command copied to clipboard');
                    }}
                  />
                </div>
              )}

              {selectedFiles.length > 0 && outputSettings.outputPath && (
                <div className="conversion-ready">
                  <p className="conversion-ready-text">
                    Ready to convert {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} to {outputSettings.format.toUpperCase()}
                    {filters.length > 0 && ` with ${filters.filter(f => f.enabled).length} filter(s)`}
                  </p>
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={!generatedCommand || isProcessing}
                    onClick={async () => {
                      if (!generatedCommand) return;
                      try {
                        setIsProcessing(true);
                        setProgress(0);
                        const ffmpegApi = window.electronAPI.ffmpeg as any;
                        const stripEnclosingQuotes = (s: string) => s.replace(/^\s*"(.*)"\s*$/, '$1').replace(/^\s*'(.*)'\s*$/, '$1');
                        // For fallback string mode, do NOT escape quotes. Wrap with plain quotes so main parser respects spaces.
                        const quoteIfNeeded = (arg: string) => (/[^A-Za-z0-9_\-./:=]/.test(arg) ? `"${arg}"` : arg);
                        let safeArgs = generatedCommand.args.map(stripEnclosingQuotes);
                        console.log('[renderer] generated args (raw):', generatedCommand.args);
                        if (safeArgs.length > 0) {
                          const last = safeArgs[safeArgs.length - 1];
                          if (last && !last.startsWith('-')) {
                            const lastSeg = last.split(/[/\\]/).pop() || '';
                            const hasDot = lastSeg.includes('.');
                            if (!hasDot) {
                              const firstName = selectedFiles[0]?.name || 'output';
                              const base = firstName.replace(/\.[^/.]+$/, '');
                              const fmt = outputSettings.format || 'mp4';
                              const dir = last.replace(/[\\/]$/, '');
                              safeArgs[safeArgs.length - 1] = `${dir}/${base}.${fmt}`;
                            }
                            // Avoid in-place output: if output equals input, rename to _converted (no spaces to survive legacy split)
                            const inputFlagIdx = safeArgs.findIndex(a => a === '-i');
                            const inputPath = inputFlagIdx >= 0 ? safeArgs[inputFlagIdx + 1] : selectedFiles[0]?.path;
                            const outputPath = safeArgs[safeArgs.length - 1];
                            const norm = (p: string) => (p || '').replace(/^\s*"|"\s*$/g, '');
                            if (norm(inputPath) === norm(outputPath)) {
                              const extMatch = outputPath.match(/\.[^./\\]+$/);
                              const ext = extMatch ? extMatch[0] : `.${outputSettings.format || 'mp4'}`;
                              const dir = outputPath.replace(/[/\\][^/\\]+$/, '');
                              const base = (selectedFiles[0]?.name || 'output').replace(/\.[^./\\]+$/, '');
                              const adjusted = `${dir}/${base}_converted${ext}`;
                              console.warn('[renderer] output equals input; adjusting to:', adjusted);
                              safeArgs[safeArgs.length - 1] = adjusted;
                            }
                            console.log('[renderer] input/output:', { input: inputPath, output: safeArgs[safeArgs.length - 1] });
                            // confirm overwrite if file exists
                            const outputPath2 = safeArgs[safeArgs.length - 1];
                            try {
                              const exists = await window.electronAPI.file.getInfo(outputPath2).then((r: any) => r.success);
                              if (exists) {
                                const resp = await window.electronAPI.dialog.confirmOverwrite(outputPath2);
                                const ok = resp?.success && resp.data === true;
                                if (!ok) {
                                  setIsProcessing(false);
                                  return;
                                }
                              }
                            } catch { }
                          }
                        }
                        let res: any;
                        try {
                          if (typeof ffmpegApi.executeArgs === 'function') {
                            res = await ffmpegApi.executeArgs(safeArgs);
                          } else {
                            throw new Error('executeArgs not available');
                          }
                        } catch (invokeErr: any) {
                          const msg = invokeErr?.message || '';
                          if (msg.includes("No handler registered for 'ffmpeg:executeArgs'")) {
                            console.warn('No handler for executeArgs; falling back to executeCommand');
                            const joined = safeArgs.map(quoteIfNeeded).join(' ');
                            res = await ffmpegApi.executeCommand(joined);
                          } else {
                            throw invokeErr;
                          }
                        }
                        if (!res.success || !res.data?.success) {
                          const errMsg = res.data?.error || 'FFmpeg execution failed';
                          console.error('FFmpeg error:', errMsg);
                          alert(`Conversion failed: ${errMsg.split('\n').slice(-3).join('\n')}`);
                        } else {
                          alert('Conversion completed successfully');
                        }
                      } catch (e: any) {
                        console.error('Execution failed', e);
                        alert(`Conversion failed: ${e?.message || String(e)}`);
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                  >
                    {isProcessing ? 'Processing…' : 'Start Conversion'}
                  </Button>
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
