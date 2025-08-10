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
