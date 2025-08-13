import React, { useState, useEffect } from 'react';
import TitleBar from './components/TitleBar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/Tabs';
import FilesTab from './components/tabs/FilesTab';
import SettingsTab from './components/tabs/SettingsTab';
import FiltersTab from './components/tabs/FiltersTab';
import PreviewTab from './components/tabs/PreviewTab';
import QueueTab from './components/tabs/QueueTab';
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

  const handleStartConversion = async () => {
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
  };

  const handleCancelConversion = async () => {
    try {
      await window.electronAPI?.queue?.stop();
    } catch (error) {
      console.error('Failed to stop conversion:', error);
      alert(`Failed to stop conversion: ${error}`);
    }
  };

  const handleCommandEdit = async (editedCommand: string) => {
    try {
      const result = await window.electronAPI?.command?.parse(editedCommand);
      if (result?.success) {
        // Update settings based on parsed command
        console.log('Parsed command:', result.data);
      }
    } catch (error) {
      console.error('Failed to parse edited command:', error);
    }
  };

  return (
    <div className="app">
      <TitleBar isMaximized={isMaximized} />
      <main className="app-content">
        <Tabs defaultValue="files" className="main-tabs">
          <TabsList>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger
              value="settings"
              disabled={selectedFiles.length === 0}
            >
              Settings
            </TabsTrigger>
            <TabsTrigger
              value="filters"
              disabled={selectedFiles.length === 0}
            >
              Filters
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              disabled={selectedFiles.length === 0 || !outputSettings.outputPath}
            >
              Preview
            </TabsTrigger>
            <TabsTrigger value="queue">Queue</TabsTrigger>
          </TabsList>

          <TabsContent value="files">
            <FilesTab
              selectedFiles={selectedFiles}
              onFilesChange={handleFilesChange}
            />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab
              selectedFiles={selectedFiles}
              outputSettings={outputSettings}
              onSettingsChange={handleOutputSettingsChange}
            />
          </TabsContent>

          <TabsContent value="filters">
            <FiltersTab
              filters={filters}
              onFiltersChange={setFilters}
              availableFilters={filterDefinitions}
              filterCategories={filterCategories}
              hasSelectedFiles={selectedFiles.length > 0}
            />
          </TabsContent>

          <TabsContent value="preview">
            <PreviewTab
              generatedCommand={generatedCommand}
              selectedFiles={selectedFiles}
              outputSettings={outputSettings}
              filters={filters}
              isProcessing={isProcessing}
              overallProgress={overallProgress}
              onCommandEdit={handleCommandEdit}
              onStartConversion={handleStartConversion}
              onCancelConversion={handleCancelConversion}
            />
          </TabsContent>

          <TabsContent value="queue">
            <QueueTab onStateChange={handleQueueStateChange} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default App;
