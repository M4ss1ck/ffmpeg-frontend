// FFmpeg Service Types
export interface FFmpegInfo {
  path: string;
  version: string;
  buildDate: string;
  configuration: string[];
}

export interface Format {
  name: string;
  longName: string;
  extensions: string[];
  mimeTypes: string[];
  canDemux: boolean;
  canMux: boolean;
}

export interface Codec {
  name: string;
  longName: string;
  type: 'video' | 'audio' | 'subtitle';
  canEncode: boolean;
  canDecode: boolean;
}

export interface Filter {
  name: string;
  description: string;
  inputs: number;
  outputs: number;
  timeline: boolean;
  slice: boolean;
  command: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
}

// File Service Types
export interface MediaFileInfo {
  path: string;
  name: string;
  size: number;
  duration?: number;
  format: string;
  streams: StreamInfo[];
  metadata: Record<string, string>;
  thumbnail?: string;
}

export interface StreamInfo {
  index: number;
  type: 'video' | 'audio' | 'subtitle';
  codec: string;
  bitrate?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  sampleRate?: number;
  channels?: number;
  language?: string;
}

export interface FileSelectOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  properties?: Array<
    'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles'
  >;
}

export interface OutputSelectOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo?: MediaFileInfo;
}

export interface FileSupportInfo {
  isSupported: boolean;
  fileType: 'video' | 'audio' | 'unknown';
}

export interface SupportedExtensions {
  video: string[];
  audio: string[];
}

// IPC Response Types
export interface IPCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Drag and Drop Types
export interface DragDropFile {
  path: string;
  name: string;
  type: string;
  size: number;
}

export interface DragDropEvent {
  files: DragDropFile[];
  x: number;
  y: number;
}

// Output Settings Types
export interface OutputSettings {
  format: string;
  codec: string;
  quality: QualitySettings;
  outputPath: string;
  customOptions?: string;
}

export interface QualitySettings {
  videoBitrate?: number;
  audioBitrate?: number;
  resolution?: Resolution;
  frameRate?: number;
  preset?: string;
  crf?: number; // Constant Rate Factor for quality-based encoding
}

export interface Resolution {
  width: number;
  height: number;
  label: string; // e.g., "1920x1080 (Full HD)"
}

export interface QualityPreset {
  id: string;
  name: string;
  description: string;
  settings: QualitySettings;
  estimatedSizeMultiplier: number; // Multiplier for file size estimation
}

export interface FormatCodecMapping {
  format: string;
  videoCodecs: string[];
  audioCodecs: string[];
  defaultVideoCodec?: string;
  defaultAudioCodec?: string;
}

export interface FileSizeEstimate {
  estimatedSize: number; // in bytes
  estimatedSizeFormatted: string; // e.g., "125 MB"
  confidence: 'low' | 'medium' | 'high';
}

// Filter System Types
export interface FilterConfig {
  id: string;
  name: string;
  parameters: Record<string, FilterParameterValue>;
  enabled: boolean;
  order: number;
}

export interface FilterParameterValue {
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean' | 'select' | 'range';
}

export interface FilterParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'range';
  description: string;
  required: boolean;
  defaultValue?: string | number | boolean;
  options?: string[]; // For select type
  min?: number; // For number/range type
  max?: number; // For number/range type
  step?: number; // For number/range type
}

export interface FilterDefinition extends Filter {
  category: string;
  parameters: FilterParameter[];
  examples?: string[];
}

export interface FilterCategory {
  name: string;
  description: string;
  filters: string[]; // Filter names in this category
}

// FFmpeg Command Generation Types
export interface FFmpegCommand {
  inputFiles: string[];
  outputFile: string;
  videoCodec?: string;
  audioCodec?: string;
  format?: string;
  quality?: QualitySettings;
  filters: FilterConfig[];
  customOptions?: string[];
}

export interface CommandGenerationOptions {
  includeProgress: boolean;
  overwriteOutput: boolean;
  verboseLogging: boolean;
}

export interface GeneratedCommand {
  command: string;
  args: string[];
  description: string;
  estimatedComplexity: 'low' | 'medium' | 'high';
}

// Processing queue types
export type JobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'canceled';

export interface ProcessingJob {
  id: string;
  inputFile: string;
  outputFile: string;
  args: string[]; // args for ffmpeg process (without executable)
  status: JobStatus;
  progress: number; // 0-100
  speed?: string; // e.g., 2.1x
  etaSeconds?: number;
  startTime?: number; // epoch ms
  endTime?: number; // epoch ms
  error?: string;
  durationSeconds?: number; // from metadata if available
}

export interface QueueState {
  jobs: ProcessingJob[];
  activeJobId?: string;
  isRunning: boolean;
}

export interface QueueStartOptions {
  parallelism?: number; // future-proof, currently 1
  retryOnFail?: boolean;
  maxRetriesPerJob?: number;
}
