import {
    FFmpegCommand,
    CommandGenerationOptions,
    GeneratedCommand,
    FilterConfig,
    QualitySettings,
} from '../../types/services';
import { basename, extname, join } from 'path';
import { filterDefinitions } from '../data/filterDefinitions.js';

class CommandGenerationService {
    /**
     * Generate FFmpeg command from configuration
     */
    generateCommand(
        command: FFmpegCommand,
        options: CommandGenerationOptions = {
            includeProgress: true,
            overwriteOutput: true,
            verboseLogging: false,
        }
    ): GeneratedCommand {
        const args: string[] = [];
        let description = 'FFmpeg conversion';
        let complexity: 'low' | 'medium' | 'high' = 'low';

        if (!command.inputFiles || command.inputFiles.length === 0) {
            return {
                command: 'ffmpeg',
                args: [],
                description: 'No input provided',
                estimatedComplexity: 'low',
            };
        }

        // For now generate a command for the first input only (batch handled later)
        const primaryInput = command.inputFiles[0];

        // Detect audio-only intents based on selected format or input extension
        const isAudioOnly = this.isAudioOnlyFormat(command.format) || this.isAudioOnlyExtension(extname(primaryInput));

        // Add input file
        args.push('-i', `"${primaryInput}"`);

        // Add codec(s)
        if (isAudioOnly) {
            // Use audio codec flag; prefer audioCodec, else reuse generic codec field via videoCodec
            const codec = command.audioCodec || command.videoCodec;
            if (codec) {
                args.push('-c:a', codec);
                description += ` with ${codec} audio codec`;
            }
        } else {
            if (command.videoCodec) {
                args.push('-c:v', command.videoCodec);
                description += ` with ${command.videoCodec} video codec`;
            }
            if (command.audioCodec) {
                args.push('-c:a', command.audioCodec);
                description += ` and ${command.audioCodec} audio codec`;
            }
        }

        // Add quality settings
        if (command.quality) {
            this.addQualitySettings(args, command.quality, isAudioOnly);
            complexity = this.updateComplexity(complexity, 'medium');
        }

        // Add filters (separate video/audio)
        if (command.filters.length > 0) {
            const { videoFilterString, audioFilterString, counts } = this.buildSeparatedFilterStrings(command.filters);
            if (videoFilterString) {
                args.push('-vf', videoFilterString);
            }
            if (audioFilterString) {
                args.push('-af', audioFilterString);
            }
            if (counts.total > 0) {
                description += ` with ${counts.total} filter(s)`;
                complexity = this.updateComplexity(complexity, 'high');
            }
        }

        // Add format
        if (command.format) {
            args.push('-f', command.format);
        }

        // Add custom options
        if (command.customOptions) {
            args.push(...command.customOptions);
            complexity = this.updateComplexity(complexity, 'medium');
        }

        // Add progress reporting
        if (options.includeProgress) {
            args.push('-progress', 'pipe:1');
        }

        // Add overwrite option
        if (options.overwriteOutput) {
            args.push('-y');
        }

        // Add verbose logging
        if (options.verboseLogging) {
            args.push('-v', 'verbose');
        }

        // Resolve output file path (directory -> file name based on input + format)
        const resolvedOutput = this.resolveOutputFilePath(command.outputFile, primaryInput, command.format);
        args.push(`"${resolvedOutput}"`);

        const fullCommand = `ffmpeg ${args.join(' ')}`;

        return {
            command: fullCommand,
            args,
            description,
            estimatedComplexity: complexity,
        };
    }

    /**
     * Build filter string from filter configurations
     */
    private buildFilterString(filters: FilterConfig[]): string {
        const enabledFilters = filters
            .filter(filter => filter.enabled)
            .sort((a, b) => a.order - b.order);

        if (enabledFilters.length === 0) {
            return '';
        }

        const filterStrings = enabledFilters.map(filter => {
            const params = this.buildFilterParameters(filter);
            return params ? `${filter.name}=${params}` : filter.name;
        });

        return filterStrings.join(',');
    }

    private buildSeparatedFilterStrings(filters: FilterConfig[]): { videoFilterString: string; audioFilterString: string; counts: { video: number; audio: number; total: number } } {
        const audioFilterNames = new Set(
            filterDefinitions
                .filter(def => def.category.toLowerCase().startsWith('audio'))
                .map(def => def.name)
        );

        const videoFilters: FilterConfig[] = [];
        const audioFilters: FilterConfig[] = [];

        filters
            .filter(f => f.enabled)
            .sort((a, b) => a.order - b.order)
            .forEach(f => {
                if (audioFilterNames.has(f.name)) {
                    audioFilters.push(f);
                } else {
                    videoFilters.push(f);
                }
            });

        const videoFilterString = this.buildFilterString(videoFilters);
        const audioFilterString = this.buildFilterString(audioFilters);

        return {
            videoFilterString,
            audioFilterString,
            counts: { video: videoFilters.length, audio: audioFilters.length, total: videoFilters.length + audioFilters.length },
        };
    }

    /**
     * Build parameter string for a filter
     */
    private buildFilterParameters(filter: FilterConfig): string {
        const params: string[] = [];

        Object.entries(filter.parameters).forEach(([key, paramValue]) => {
            if (paramValue.value !== undefined && paramValue.value !== '') {
                let value = paramValue.value;

                // Handle different parameter types
                if (paramValue.type === 'string' && typeof value === 'string') {
                    // Escape special characters in string values
                    value = value.replace(/[,:=]/g, '\\$&');
                }

                params.push(`${key}=${value}`);
            }
        });

        return params.join(':');
    }

    /**
     * Add quality settings to command arguments
     */
    private addQualitySettings(args: string[], quality: QualitySettings, isAudioOnly: boolean): void {
        // Audio-only: only apply audio bitrate
        if (isAudioOnly) {
            if (quality.audioBitrate) {
                args.push('-b:a', `${quality.audioBitrate}k`);
            }
            return;
        }

        // Video bitrate
        if (quality.videoBitrate) {
            args.push('-b:v', `${quality.videoBitrate}k`);
        }

        // Audio bitrate
        if (quality.audioBitrate) {
            args.push('-b:a', `${quality.audioBitrate}k`);
        }

        // Resolution
        if (quality.resolution) {
            args.push('-s', `${quality.resolution.width}x${quality.resolution.height}`);
        }

        // Frame rate
        if (quality.frameRate) {
            args.push('-r', quality.frameRate.toString());
        }

        // CRF (Constant Rate Factor)
        if (quality.crf !== undefined) {
            args.push('-crf', quality.crf.toString());
        }

        // Preset
        if (quality.preset) {
            args.push('-preset', quality.preset);
        }
    }

    /**
     * Update complexity level
     */
    private updateComplexity(
        current: 'low' | 'medium' | 'high',
        newLevel: 'low' | 'medium' | 'high'
    ): 'low' | 'medium' | 'high' {
        const levels = { low: 1, medium: 2, high: 3 };
        return levels[newLevel] > levels[current] ? newLevel : current;
    }

    /**
     * Validate command configuration
     */
    validateCommand(command: FFmpegCommand): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Check input files
        if (!command.inputFiles || command.inputFiles.length === 0) {
            errors.push('At least one input file is required');
        }

        // Check output file
        if (!command.outputFile || command.outputFile.trim() === '') {
            errors.push('Output file path is required');
        }

        // Validate filter parameters
        command.filters.forEach(filter => {
            Object.entries(filter.parameters).forEach(([key, paramValue]) => {
                if (paramValue.type === 'number' && typeof paramValue.value === 'string') {
                    const numValue = parseFloat(paramValue.value);
                    if (isNaN(numValue)) {
                        errors.push(`Invalid number value for ${filter.name}.${key}: ${paramValue.value}`);
                    }
                }
            });
        });

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Parse command string back to configuration (for manual editing)
     */
    parseCommand(commandString: string): Partial<FFmpegCommand> {
        const args = this.parseCommandArgs(commandString);
        const config: Partial<FFmpegCommand> = {
            inputFiles: [],
            filters: [],
            customOptions: [],
        };

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            const nextArg = args[i + 1];

            switch (arg) {
                case '-i':
                    if (nextArg) {
                        config.inputFiles!.push(nextArg.replace(/"/g, ''));
                        i++;
                    }
                    break;
                case '-c:v':
                    if (nextArg) {
                        config.videoCodec = nextArg;
                        i++;
                    }
                    break;
                case '-c:a':
                    if (nextArg) {
                        config.audioCodec = nextArg;
                        i++;
                    }
                    break;
                case '-f':
                    if (nextArg) {
                        config.format = nextArg;
                        i++;
                    }
                    break;
                case '-vf':
                    if (nextArg) {
                        config.filters = this.parseFilterString(nextArg);
                        i++;
                    }
                    break;
                case '-af':
                    if (nextArg) {
                        const audioFilters = this.parseFilterString(nextArg);
                        config.filters = [...(config.filters || []), ...audioFilters];
                        i++;
                    }
                    break;
                case '-b:v':
                    if (nextArg) {
                        config.quality = config.quality || {};
                        config.quality.videoBitrate = parseInt(nextArg.replace('k', ''));
                        i++;
                    }
                    break;
                case '-b:a':
                    if (nextArg) {
                        config.quality = config.quality || {};
                        config.quality.audioBitrate = parseInt(nextArg.replace('k', ''));
                        i++;
                    }
                    break;
                case '-s':
                    if (nextArg) {
                        const [width, height] = nextArg.split('x').map(Number);
                        config.quality = config.quality || {};
                        config.quality.resolution = {
                            width,
                            height,
                            label: `${width}x${height}`,
                        };
                        i++;
                    }
                    break;
                case '-r':
                    if (nextArg) {
                        config.quality = config.quality || {};
                        config.quality.frameRate = parseFloat(nextArg);
                        i++;
                    }
                    break;
                case '-crf':
                    if (nextArg) {
                        config.quality = config.quality || {};
                        config.quality.crf = parseInt(nextArg);
                        i++;
                    }
                    break;
                case '-preset':
                    if (nextArg) {
                        config.quality = config.quality || {};
                        config.quality.preset = nextArg;
                        i++;
                    }
                    break;
                default:
                    // Handle output file (last argument without flag)
                    if (i === args.length - 1 && !arg.startsWith('-')) {
                        config.outputFile = arg.replace(/"/g, '');
                    }
                    break;
            }
        }

        return config;
    }

    /**
     * Parse command string into arguments array
     */
    private parseCommandArgs(commandString: string): string[] {
        // Remove 'ffmpeg' from the beginning if present
        const cleanCommand = commandString.replace(/^ffmpeg\s+/, '');

        // Simple argument parsing (handles quoted strings)
        const args: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < cleanCommand.length; i++) {
            const char = cleanCommand[i];

            if (char === '"' && (i === 0 || cleanCommand[i - 1] !== '\\')) {
                inQuotes = !inQuotes;
                current += char;
            } else if (char === ' ' && !inQuotes) {
                if (current.trim()) {
                    args.push(current.trim());
                    current = '';
                }
            } else {
                current += char;
            }
        }

        if (current.trim()) {
            args.push(current.trim());
        }

        return args;
    }

    /**
     * Parse filter string back to filter configurations
     */
    private parseFilterString(filterString: string): FilterConfig[] {
        const filters: FilterConfig[] = [];
        const filterParts = filterString.split(',');

        filterParts.forEach((filterPart, index) => {
            const [name, ...paramParts] = filterPart.split('=');
            const parameters: Record<string, any> = {};

            if (paramParts.length > 0) {
                const paramString = paramParts.join('=');
                const paramPairs = paramString.split(':');

                paramPairs.forEach(pair => {
                    const [key, value] = pair.split('=');
                    if (key && value) {
                        parameters[key] = {
                            value: value.replace(/\\([,:=])/g, '$1'), // Unescape special characters
                            type: 'string', // Default type, would need more context to determine actual type
                        };
                    }
                });
            }

            filters.push({
                id: `filter_${index}`,
                name: name.trim(),
                parameters,
                enabled: true,
                order: index,
            });
        });

        return filters;
    }

    private resolveOutputFilePath(outputPathOrDir: string, inputFile: string, format?: string): string {
        const inputBase = basename(inputFile, extname(inputFile));
        const targetExt = this.normalizeFormatExtension(format || extname(inputFile).replace(/^\./, ''));

        // Heuristic: if path ends with a path separator or has no dot in last segment, treat as directory
        const lastSegment = outputPathOrDir.split(/[/\\]/).pop() || '';
        const looksLikeDirectory = !lastSegment.includes('.') || /[/\\]$/.test(outputPathOrDir);

        if (looksLikeDirectory) {
            return join(outputPathOrDir, `${inputBase}.${targetExt}`);
        }

        // If a file path is provided without extension and format is known, append it
        if (!lastSegment.includes('.') && targetExt) {
            return `${outputPathOrDir}.${targetExt}`;
        }

        return outputPathOrDir;
    }

    private normalizeFormatExtension(fmt: string): string {
        const f = (fmt || '').toLowerCase();
        const map: Record<string, string> = {
            'mpeg4': 'mp4',
        };
        return map[f] || f.replace(/^\./, '');
    }

    private isAudioOnlyFormat(fmt?: string): boolean {
        if (!fmt) return false;
        const audioFormats = new Set(['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a']);
        return audioFormats.has(fmt.toLowerCase());
    }

    private isAudioOnlyExtension(extWithDot?: string): boolean {
        if (!extWithDot) return false;
        const ext = extWithDot.replace(/^\./, '').toLowerCase();
        const audioExts = new Set(['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus']);
        return audioExts.has(ext);
    }
}

export const commandGenerationService = new CommandGenerationService();