import React, { useState, useEffect } from 'react';
import TitleBar from './components/TitleBar';
import UIDemo from './components/UIDemo';
import FileInputInterface from './components/FileInputInterface';
import OutputSettings from './components/OutputSettings';
import FilterPanel from './components/FilterPanel';
import CommandPreview from './components/CommandPreview';
import ProcessingQueue from './components/ProcessingQueue';
import Button from './components/ui/Button';
import {
  MediaFileInfo,
  OutputSettings as OutputSettingsType,
  FilterConfig,
  FilterDefinition,
  FilterCategory,
  FFmpegCommand,
  GeneratedCommand,
  ProcessingJob,
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
  const [overallProgress, setOverallProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

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

  // Function to update progress from ProcessingQueue component
  const handleQueueStateChange = (state: any) => {
    setIsProcessing(state.isRunning);

    // Calculate overall progress
    if (state.jobs.length > 0) {
      const totalProgress = state.jobs.reduce((sum: number, job: any) => sum + job.progress, 0);
      const avgProgress = totalProgress / state.jobs.length;
      setOverallProgress(avgProgress);
    } else {
      setOverallProgress(0);
    }
  };

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
              <div className="interface-sections">
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
                <div className={`conversion-ready ${isProcessing ? 'processing' : ''}`}>
                  <p className="conversion-ready-text">
                    Ready to convert {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} to {outputSettings.format.toUpperCase()}
                    {filters.length > 0 && ` with ${filters.filter(f => f.enabled).length} filter(s)`}
                  </p>
                  {isProcessing && (
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${overallProgress}%` }}
                        />
                      </div>
                      <div className="progress-text">
                        {overallProgress > 0 ? `${Math.round(overallProgress)}%` : 'Starting conversion...'}
                      </div>
                    </div>
                  )}
                  <div className="conversion-actions">
                    {!isProcessing ? (
                      <Button
                        variant="primary"
                        size="lg"
                        disabled={!generatedCommand}
                        onClick={async () => {
                          if (!generatedCommand) return;

                          try {
                            // Process each selected file
                            for (const file of selectedFiles) {
                              // Generate output path for this file
                              const outputDir = outputSettings.outputPath.replace(/[/\\][^/\\]*$/, '');
                              const baseName = file.name.replace(/\.[^/.]+$/, '');
                              const outputFile = `${outputDir}/${baseName}_converted.${outputSettings.format}`;

                              // Create job for this file
                              const job: Omit<ProcessingJob, 'id' | 'status' | 'progress'> = {
                                inputFile: file.path,
                                outputFile,
                                args: generatedCommand.args.map(arg =>
                                  arg === selectedFiles[0].path ? file.path :
                                    arg === outputSettings.outputPath ? outputFile : arg
                                ),
                                durationSeconds: file.duration,
                              };

                              // Add job to queue
                              const result = await window.electronAPI?.queue?.addJob(job);
                              if (!result?.success) {
                                console.error('Failed to add job to queue:', result?.error);
                              }
                            }

                            // Start the queue
                            await window.electronAPI?.queue?.start({
                              retryOnFail: true,
                              maxRetriesPerJob: 2,
                            });

                          } catch (error) {
                            console.error('Failed to start conversion:', error);
                            alert(`Failed to start conversion: ${error}`);
                          }
                        }}
                      >
                        Start Conversion
                      </Button>
                    ) : (
                      <Button
                        variant="danger-outline"
                        size="lg"
                        onClick={async () => {
                          try {
                            await window.electronAPI?.queue?.stop();
                          } catch (error) {
                            console.error('Failed to stop conversion:', error);
                            alert(`Failed to stop conversion: ${error}`);
                          }
                        }}
                      >
                        Cancel Conversion
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Processing Queue */}
              <ProcessingQueue
                className="processing-queue-section"
                onStateChange={handleQueueStateChange}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
