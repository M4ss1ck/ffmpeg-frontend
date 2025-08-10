import { dialog, BrowserWindow } from 'electron';
import { stat, access } from 'fs/promises';
import { extname, basename } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ffmpegService } from './ffmpegService.js';

const execAsync = promisify(exec);

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
    properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles'>;
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

class FileService {
    private readonly supportedVideoExtensions = [
        '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v',
        '.3gp', '.asf', '.f4v', '.m2ts', '.mts', '.ts', '.vob', '.ogv'
    ];

    private readonly supportedAudioExtensions = [
        '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma', '.ac3',
        '.dts', '.opus', '.amr', '.aiff', '.au', '.ra', '.ape'
    ];

    /**
     * Get comprehensive file information including metadata
     */
    async getFileInfo(filePath: string): Promise<MediaFileInfo> {
        try {
            // Get basic file stats
            const stats = await stat(filePath);
            const extension = extname(filePath).toLowerCase();
            const fileName = basename(filePath);

            // Check if file is accessible
            await access(filePath);

            // Get media metadata using FFprobe
            const metadata = await this.getMediaMetadata(filePath);

            return {
                path: filePath,
                name: fileName,
                size: stats.size,
                format: extension.slice(1), // Remove the dot
                duration: metadata.duration,
                streams: metadata.streams || [],
                metadata: metadata.metadata || {},
                thumbnail: metadata.thumbnail
            };
        } catch (error) {
            throw new Error(`Failed to get file info for ${filePath}: ${error}`);
        }
    }

    /**
     * Select files using native dialog
     */
    async selectFiles(window: BrowserWindow, options: FileSelectOptions = {}): Promise<string[]> {
        const defaultFilters = [
            {
                name: 'Video Files',
                extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp']
            },
            {
                name: 'Audio Files',
                extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus']
            },
            {
                name: 'All Media Files',
                extensions: [
                    'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp',
                    'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus'
                ]
            },
            { name: 'All Files', extensions: ['*'] }
        ];

        const result = await dialog.showOpenDialog(window, {
            title: options.title || 'Select Media Files',
            defaultPath: options.defaultPath,
            filters: options.filters || defaultFilters,
            properties: options.properties || ['openFile', 'multiSelections']
        });

        return result.canceled ? [] : result.filePaths;
    }

    /**
     * Select output file path using native dialog
     */
    async selectOutputPath(window: BrowserWindow, options: OutputSelectOptions = {}): Promise<string | null> {
        const defaultFilters = [
            {
                name: 'Video Files',
                extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm']
            },
            {
                name: 'Audio Files',
                extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a']
            },
            { name: 'All Files', extensions: ['*'] }
        ];

        const result = await dialog.showSaveDialog(window, {
            title: options.title || 'Save Output File',
            defaultPath: options.defaultPath,
            filters: options.filters || defaultFilters
        });

        return result.canceled ? null : result.filePath;
    }

    /**
     * Validate file for media processing
     */
    async validateFile(filePath: string): Promise<FileValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Check if file exists and is accessible
            await access(filePath);
            const stats = await stat(filePath);

            // Check file size (warn if > 2GB, error if > 10GB)
            const sizeGB = stats.size / (1024 * 1024 * 1024);
            if (sizeGB > 10) {
                errors.push(`File is too large (${sizeGB.toFixed(1)}GB). Maximum supported size is 10GB.`);
            } else if (sizeGB > 2) {
                warnings.push(`Large file detected (${sizeGB.toFixed(1)}GB). Processing may take significant time.`);
            }

            // Check file extension
            const extension = extname(filePath).toLowerCase();
            const isVideo = this.supportedVideoExtensions.includes(extension);
            const isAudio = this.supportedAudioExtensions.includes(extension);

            if (!isVideo && !isAudio) {
                errors.push(`Unsupported file format: ${extension}`);
            }

            // Get detailed file info if basic validation passes
            let fileInfo: MediaFileInfo | undefined;
            if (errors.length === 0) {
                try {
                    fileInfo = await this.getFileInfo(filePath);

                    // Additional validation based on metadata
                    if (fileInfo.streams.length === 0) {
                        errors.push('No valid media streams found in file');
                    }

                    // Check for corrupted files
                    if (fileInfo.duration === 0) {
                        warnings.push('File appears to have zero duration - may be corrupted');
                    }

                } catch (metadataError) {
                    errors.push(`Failed to read file metadata: ${metadataError}`);
                }
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                fileInfo
            };

        } catch (error) {
            errors.push(`File access error: ${error}`);
            return {
                isValid: false,
                errors,
                warnings
            };
        }
    }

    /**
     * Validate multiple files
     */
    async validateFiles(filePaths: string[]): Promise<Map<string, FileValidationResult>> {
        const results = new Map<string, FileValidationResult>();

        // Process files in parallel for better performance
        const validationPromises = filePaths.map(async (filePath) => {
            const result = await this.validateFile(filePath);
            return { filePath, result };
        });

        const validationResults = await Promise.all(validationPromises);

        for (const { filePath, result } of validationResults) {
            results.set(filePath, result);
        }

        return results;
    }

    /**
     * Check if file extension is supported
     */
    isFileSupported(filePath: string): boolean {
        const extension = extname(filePath).toLowerCase();
        return this.supportedVideoExtensions.includes(extension) ||
            this.supportedAudioExtensions.includes(extension);
    }

    /**
     * Get file type (video/audio) based on extension
     */
    getFileType(filePath: string): 'video' | 'audio' | 'unknown' {
        const extension = extname(filePath).toLowerCase();

        if (this.supportedVideoExtensions.includes(extension)) {
            return 'video';
        } else if (this.supportedAudioExtensions.includes(extension)) {
            return 'audio';
        }

        return 'unknown';
    }

    /**
     * Get supported file extensions
     */
    getSupportedExtensions(): { video: string[]; audio: string[] } {
        return {
            video: [...this.supportedVideoExtensions],
            audio: [...this.supportedAudioExtensions]
        };
    }

    /**
     * Generate thumbnail for video file
     */
    async generateThumbnail(filePath: string, outputPath: string, timeOffset: number = 10): Promise<string> {
        try {
            await ffmpegService.detectFFmpeg();

            const command = [
                '-i', `"${filePath}"`,
                '-ss', timeOffset.toString(),
                '-vframes', '1',
                '-q:v', '2',
                '-y',
                `"${outputPath}"`
            ].join(' ');

            const result = await ffmpegService.executeCommand(command);

            if (!result.success) {
                throw new Error(`Thumbnail generation failed: ${result.error}`);
            }

            return outputPath;
        } catch (error) {
            throw new Error(`Failed to generate thumbnail: ${error}`);
        }
    }

    /**
     * Get media metadata using FFprobe
     */
    private async getMediaMetadata(filePath: string): Promise<Partial<MediaFileInfo>> {
        try {
            // Ensure FFmpeg is available (FFprobe comes with FFmpeg)
            const ffmpegInfo = await ffmpegService.detectFFmpeg();
            const ffprobePath = ffmpegInfo.path.replace('ffmpeg', 'ffprobe');

            const command = [
                `"${ffprobePath}"`,
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                `"${filePath}"`
            ].join(' ');

            const { stdout } = await execAsync(command);
            const probeData = JSON.parse(stdout);

            return this.parseProbeData(probeData);
        } catch (error) {
            // If FFprobe fails, return basic info
            console.warn(`FFprobe failed for ${filePath}:`, error);
            return {
                duration: undefined,
                streams: [],
                metadata: {}
            };
        }
    }

    /**
     * Parse FFprobe JSON output
     */
    private parseProbeData(probeData: any): Partial<MediaFileInfo> {
        const format = probeData.format || {};
        const streams = probeData.streams || [];

        // Parse streams
        const streamInfos: StreamInfo[] = streams.map((stream: any, index: number) => {
            const streamInfo: StreamInfo = {
                index,
                type: this.getStreamType(stream.codec_type),
                codec: stream.codec_name || 'unknown'
            };

            // Add type-specific properties
            if (stream.codec_type === 'video') {
                streamInfo.width = stream.width;
                streamInfo.height = stream.height;
                streamInfo.frameRate = this.parseFrameRate(stream.r_frame_rate);
                streamInfo.bitrate = parseInt(stream.bit_rate) || undefined;
            } else if (stream.codec_type === 'audio') {
                streamInfo.sampleRate = stream.sample_rate;
                streamInfo.channels = stream.channels;
                streamInfo.bitrate = parseInt(stream.bit_rate) || undefined;
            }

            // Language information
            if (stream.tags && stream.tags.language) {
                streamInfo.language = stream.tags.language;
            }

            return streamInfo;
        });

        // Parse metadata
        const metadata: Record<string, string> = {};
        if (format.tags) {
            for (const [key, value] of Object.entries(format.tags)) {
                if (typeof value === 'string') {
                    metadata[key.toLowerCase()] = value;
                }
            }
        }

        return {
            duration: parseFloat(format.duration) || undefined,
            streams: streamInfos,
            metadata
        };
    }

    /**
     * Get stream type from codec_type
     */
    private getStreamType(codecType: string): 'video' | 'audio' | 'subtitle' {
        switch (codecType) {
            case 'video':
                return 'video';
            case 'audio':
                return 'audio';
            case 'subtitle':
                return 'subtitle';
            default:
                return 'video'; // Default fallback
        }
    }

    /**
     * Parse frame rate from FFprobe format (e.g., "30/1" -> 30)
     */
    private parseFrameRate(frameRateStr: string): number | undefined {
        if (!frameRateStr) return undefined;

        const parts = frameRateStr.split('/');
        if (parts.length === 2) {
            const numerator = parseInt(parts[0]);
            const denominator = parseInt(parts[1]);
            if (denominator !== 0) {
                return numerator / denominator;
            }
        }

        return parseFloat(frameRateStr) || undefined;
    }
}

export const fileService = new FileService();