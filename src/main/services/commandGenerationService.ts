import {
    FFmpegCommand,
    CommandGenerationOptions,
    GeneratedCommand,
    FilterConfig,
    QualitySettings,
    FilterParameterValue,
} from '../../types/services';
import { basename, extname, join, dirname, normalize } from 'path';
import { existsSync } from 'fs';
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

        console.log('[cmdgen] inputs:', {
            inputFiles: command.inputFiles,
            outputFile: command.outputFile,
            format: command.format,
        });

        if (!command.inputFiles || command.inputFiles.length === 0) {
            return {
                command: 'ffmpeg',
                args: [],
                description: 'No input provided',
                estimatedComplexity: 'low',
            };
        }

        // Add all input files
        command.inputFiles.forEach(inputFile => {
            args.push('-i', inputFile);
        });

        const primaryInput = command.inputFiles[0];

        // Detect audio-only intents based on selected format or input extension
        const isAudioOnly = this.isAudioOnlyFormat(command.format) || this.isAudioOnlyExtension(extname(primaryInput));

        // Update description to reflect multiple files
        if (command.inputFiles.length > 1) {
            description = `FFmpeg batch conversion (${command.inputFiles.length} files)`;
        }

        // Add codec(s)
        if (isAudioOnly) {
            // For audio-only formats, disable video and set audio codec
            args.push('-vn'); // Disable video stream
            const codec = command.audioCodec || this.getDefaultAudioCodecForFormat(command.format);
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
        } else {
            args.push('-n');
        }

        // Add verbose logging
        if (options.verboseLogging) {
            args.push('-v', 'verbose');
        }

        // Resolve output file path (directory -> file name based on input + format)
        let resolvedOutput = this.resolveOutputFilePath(command.outputFile, primaryInput, command.format);
        console.log('[cmdgen] resolvedOutput initially:', resolvedOutput);
        // Avoid in-place editing: output must not equal input
        if (this.pathsEqual(resolvedOutput, primaryInput)) {
            const adjusted = this.makeNonInPlaceOutput(resolvedOutput);
            console.log('[cmdgen] pathsEqual -> adjusting output:', {
                input: primaryInput,
                outputBefore: resolvedOutput,
                outputAfter: adjusted,
            });
            resolvedOutput = adjusted;
        }
        args.push(resolvedOutput);

        const fullCommand = this.buildDisplayCommand(args);
        console.log('[cmdgen] final args:', args);
        console.log('[cmdgen] display command:', fullCommand);

        return {
            command: fullCommand,
            args,
            description,
            estimatedComplexity: complexity,
        };
    }

    private buildDisplayCommand(args: string[]): string {
        const needsQuoting = /\s|["'\\]/;
        const quote = (arg: string): string => {
            if (!needsQuoting.test(arg)) return arg;
            const escaped = arg.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            return `"${escaped}"`;
        };
        return `ffmpeg ${args.map(quote).join(' ')}`;
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
            const actualName = filter.name; // 1:1 mapping with FFmpeg filter names
            const params = this.buildFilterParameters(actualName, filter);
            return params ? `${actualName}=${params}` : actualName;
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
    private buildFilterParameters(actualName: string, filter: FilterConfig): string {
        const params: string[] = [];

        Object.entries(filter.parameters).forEach(([key, paramValue]) => {
            if (paramValue.value !== undefined && paramValue.value !== '') {
                let value = paramValue.value as unknown;

                const mappedKey = this.mapParameterKey(actualName, filter.name, key);

                // Handle different parameter types
                if (paramValue.type === 'string' && typeof value === 'string') {
                    // Escape special characters in string values
                    value = value.replace(/[,:=]/g, '\\$&');
                }

                params.push(`${mappedKey}=${value}`);
            }
        });

        return params.join(':');
    }

    private mapParameterKey(actualName: string, _originalName: string, key: string): string {
        // Per-filter key maps
        const perFilterMaps: Record<string, Record<string, string>> = {
            // Video scaling
            scale: { width: 'w', height: 'h' },
            // Video crop
            crop: { width: 'w', height: 'h' },
            // Audio filters
            highpass: { frequency: 'f', poles: 'p' },
            lowpass: { frequency: 'f', poles: 'p' },
        };

        // Prefer specific per-filter maps
        const byActual = perFilterMaps[actualName];
        if (byActual && byActual[key]) return byActual[key];

        return key;
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
            const parameters: Record<string, FilterParameterValue> = {};

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
        console.log('[cmdgen.resolve] inputs:', { outputPathOrDir, inputFile, format });
        const inputBase = basename(inputFile, extname(inputFile));
        const targetExt = this.normalizeFormatExtension(format || extname(inputFile).replace(/^\./, ''));

        // Heuristic: if path ends with a path separator or has no dot in last segment, treat as directory
        const lastSegment = outputPathOrDir.split(/[/\\]/).pop() || '';
        const looksLikeDirectory = !lastSegment.includes('.') || /[/\\]$/.test(outputPathOrDir);

        if (looksLikeDirectory) {
            const inputDir = dirname(inputFile);
            const outDir = outputPathOrDir.replace(/[\\/]$/, '');
            const currentExt = extname(inputFile).replace(/^\./, '').toLowerCase();
            const sameDir = outDir === inputDir;
            const sameExt = currentExt === (targetExt || '').toLowerCase();
            if (sameDir && sameExt) {
                const candidate = join(outDir, `${inputBase} (converted).${targetExt}`);
                console.log('[cmdgen.resolve] directory target equals input dir/ext; using:', candidate);
                return candidate;
            }
            const candidate = join(outDir, `${inputBase}.${targetExt}`);
            console.log('[cmdgen.resolve] directory target using:', candidate);
            return candidate;
        }

        // If a file path is provided without extension and format is known, append it
        if (!lastSegment.includes('.') && targetExt) {
            const candidate = `${outputPathOrDir}.${targetExt}`;
            console.log('[cmdgen.resolve] file path without ext; using:', candidate);
            return candidate;
        }

        console.log('[cmdgen.resolve] explicit file path:', outputPathOrDir);
        return outputPathOrDir;
    }

    private makeNonInPlaceOutput(pathStr: string): string {
        const dir = dirname(pathStr);
        const base = basename(pathStr, extname(pathStr));
        const ext = extname(pathStr);
        // Suggest ' (converted)' first, then numbered fallbacks if exists
        let candidate = join(dir, `${base} (converted)${ext}`);
        if (!existsSync(candidate)) return candidate;
        let i = 1;
        while (existsSync(candidate)) {
            candidate = join(dir, `${base} (${i})${ext}`);
            i += 1;
        }
        return candidate;
    }

    private pathsEqual(a: string, b: string): boolean {
        const sanitize = (p: string) => normalize(p.replace(/^['"]|['"]$/g, ''));
        const sa = sanitize(a);
        const sb = sanitize(b);
        const eq = sa === sb;
        if (eq) {
            console.log('[cmdgen.pathsEqual] equal', { a, b, sa, sb });
        }
        return eq;
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

    private getDefaultAudioCodecForFormat(format?: string): string {
        if (!format) return 'aac';

        const codecMap: Record<string, string> = {
            'mp3': 'mp3',
            'wav': 'pcm_s16le',
            'flac': 'flac',
            'aac': 'aac',
            'ogg': 'libvorbis',
            'm4a': 'aac',
        };

        return codecMap[format.toLowerCase()] || 'aac';
    }
}

export const commandGenerationService = new CommandGenerationService();