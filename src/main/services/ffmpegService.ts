import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

class FFmpegService {
  private ffmpegPath: string | null = null;

  private ffmpegInfo: FFmpegInfo | null = null;
  private formatsCache: Format[] | null = null;
  private codecsCache: Codec[] | null = null;
  private filtersCache: Filter[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Detect FFmpeg binary in system PATH and common locations
   */
  async detectFFmpeg(): Promise<FFmpegInfo> {
    if (this.ffmpegInfo && this.ffmpegPath) {
      return this.ffmpegInfo;
    }

    const possiblePaths = this.getPossibleFFmpegPaths();

    for (const path of possiblePaths) {
      try {
        const info = await this.testFFmpegPath(path);
        if (info) {
          this.ffmpegPath = path;

          this.ffmpegInfo = info;
          return info;
        }
      } catch (error) {
        // Continue to next path
        continue;
      }
    }

    throw new Error(
      'FFmpeg not found. Please install FFmpeg or specify a custom path.'
    );
  }

  /**
   * Set custom FFmpeg path
   */
  async setCustomFFmpegPath(customPath: string): Promise<FFmpegInfo> {
    const info = await this.testFFmpegPath(customPath);
    if (!info) {
      throw new Error(`Invalid FFmpeg binary at: ${customPath}`);
    }

    this.ffmpegPath = customPath;

    this.ffmpegInfo = info;
    this.clearCache(); // Clear cache when changing FFmpeg binary

    return info;
  }

  /**
   * Get available formats with caching
   */
  async getFormats(): Promise<Format[]> {
    if (this.isCacheValid() && this.formatsCache) {
      return this.formatsCache;
    }

    await this.ensureFFmpegDetected();

    try {
      const { stdout } = await execAsync(`"${this.ffmpegPath}" -formats`);
      const formats = this.parseFormats(stdout);

      this.formatsCache = formats;
      this.updateCacheTimestamp();

      return formats;
    } catch (error) {
      throw new Error(`Failed to get formats: ${error}`);
    }
  }

  /**
   * Get available codecs with caching
   */
  async getCodecs(): Promise<Codec[]> {
    if (this.isCacheValid() && this.codecsCache) {
      return this.codecsCache;
    }

    await this.ensureFFmpegDetected();

    try {
      const { stdout } = await execAsync(`"${this.ffmpegPath}" -codecs`);
      const codecs = this.parseCodecs(stdout);

      this.codecsCache = codecs;
      this.updateCacheTimestamp();

      return codecs;
    } catch (error) {
      throw new Error(`Failed to get codecs: ${error}`);
    }
  }

  /**
   * Get available filters with caching
   */
  async getFilters(): Promise<Filter[]> {
    if (this.isCacheValid() && this.filtersCache) {
      return this.filtersCache;
    }

    await this.ensureFFmpegDetected();

    try {
      const { stdout } = await execAsync(`"${this.ffmpegPath}" -filters`);
      const filters = this.parseFilters(stdout);

      this.filtersCache = filters;
      this.updateCacheTimestamp();

      return filters;
    } catch (error) {
      throw new Error(`Failed to get filters: ${error}`);
    }
  }

  /**
   * Validate FFmpeg command syntax
   */
  async validateCommand(command: string): Promise<ValidationResult> {
    await this.ensureFFmpegDetected();

    try {
      // Use -f null to avoid actual processing, just validate syntax
      const testCommand =
        command.replace(/(-i\s+)"([^"]+)"/g, '$1"/dev/null"') + ' -f null -';
      const { stderr } = await execAsync(
        `"${this.ffmpegPath}" ${testCommand}`,
        { timeout: 5000 }
      );

      const warnings = this.extractWarnings(stderr);

      return {
        isValid: true,
        errors: [],
        warnings,
      };
    } catch (error: unknown) {
      const errorObj = error as any;
      const errors = this.extractErrors(
        errorObj.stderr || errorObj.message || String(error)
      );
      const warnings = this.extractWarnings(errorObj.stderr || '');

      return {
        isValid: false,
        errors,
        warnings,
      };
    }
  }

  /**
   * Execute FFmpeg command
   */
  async executeCommand(
    command: string,
    onProgress?: (progress: number) => void
  ): Promise<ExecutionResult> {
    await this.ensureFFmpegDetected();

    return new Promise(resolve => {
      const argv = this.parseCommandArgs(command);
      const process = spawn(this.ffmpegPath!, argv, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';
      let errorOutput = '';

      process.stdout?.on('data', data => {
        output += data.toString();
      });

      process.stderr?.on('data', data => {
        const chunk = data.toString();
        errorOutput += chunk;

        // Extract progress information if callback provided
        if (onProgress) {
          const progress = this.extractProgress(chunk);
          if (progress !== null) {
            onProgress(progress);
          }
        }
      });

      process.on('close', code => {
        resolve({
          success: code === 0,
          output,
          error: code !== 0 ? errorOutput : undefined,
          exitCode: code || 0,
        });
      });

      process.on('error', error => {
        resolve({
          success: false,
          output,
          error: error.message,
          exitCode: -1,
        });
      });
    });
  }

  /** Execute ffmpeg with args array and richer progress (optional duration) */
  async executeArgs(
    args: string[],
    onProgress?: (progress: number, details?: { time?: number; speed?: string }) => void,
    totalDurationSeconds?: number
  ): Promise<ExecutionResult> {
    await this.ensureFFmpegDetected();

    return new Promise(resolve => {
      const sanitizedArgs = args.map(a => this.stripEnclosingQuotes(a));
      console.log('[ffmpeg.executeArgs] argv:', sanitizedArgs);
      const proc = spawn(this.ffmpegPath!, sanitizedArgs, { stdio: ['ignore', 'ignore', 'pipe'] });
      let stdout = '';
      let stderr = '';

      // stdio set to ignore for stdout; keep only stderr parsing for progress/errors
      proc.stderr?.on('data', d => {
        const chunk = d.toString();
        stderr += chunk;
        if (chunk.includes('Output') || chunk.includes('Input') || chunk.includes('Error')) {
          console.log('[ffmpeg.stderr]', chunk.trim());
        }
        if (onProgress) {
          const { percent, timeSeconds, speed } = this.extractProgressDetails(chunk, totalDurationSeconds);
          if (percent !== null) onProgress(percent, { time: timeSeconds, speed });
        }
      });

      proc.on('close', code =>
        resolve({ success: code === 0, output: stdout, error: code !== 0 ? stderr : undefined, exitCode: code || 0 })
      );

      proc.on('error', err =>
        resolve({ success: false, output: stdout, error: err.message, exitCode: -1 })
      );
    });
  }

  /**
   * Get possible FFmpeg installation paths
   */
  private getPossibleFFmpegPaths(): string[] {
    const paths: string[] = [];

    // System PATH
    paths.push('ffmpeg');

    // Common installation paths by platform
    switch (process.platform) {
      case 'win32':
        paths.push(
          'C:\\ffmpeg\\bin\\ffmpeg.exe',
          'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
          'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe'
        );
        break;
      case 'darwin':
        paths.push(
          '/usr/local/bin/ffmpeg',
          '/opt/homebrew/bin/ffmpeg',
          '/usr/bin/ffmpeg'
        );
        break;
      case 'linux':
        paths.push(
          '/usr/bin/ffmpeg',
          '/usr/local/bin/ffmpeg',
          '/snap/bin/ffmpeg'
        );
        break;
    }

    return paths;
  }

  /**
   * Test if FFmpeg binary is valid and get its info
   */
  private async testFFmpegPath(path: string): Promise<FFmpegInfo | null> {
    try {
      const { stdout } = await execAsync(`"${path}" -version`, {
        timeout: 5000,
      });
      return this.parseFFmpegVersion(stdout, path);
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse FFmpeg version output
   */
  private parseFFmpegVersion(output: string, path: string): FFmpegInfo {
    const lines = output.split('\n');
    const versionLine = lines[0];
    const buildLine = lines.find(line => line.includes('built on')) || '';
    const configLine =
      lines.find(line => line.includes('configuration:')) || '';

    const versionMatch = versionLine.match(/ffmpeg version ([^\s]+)/);
    const buildMatch = buildLine.match(/built on ([^,]+)/);
    const configMatch = configLine.match(/configuration: (.+)/);

    return {
      path,
      version: versionMatch?.[1] || 'unknown',
      buildDate: buildMatch?.[1] || 'unknown',
      configuration: configMatch?.[1]?.split(' ') || [],
    };
  }

  /**
   * Parse formats output
   */
  private parseFormats(output: string): Format[] {
    const formats: Format[] = [];
    const lines = output.split('\n');
    let inFormatsSection = false;

    for (const line of lines) {
      if (line.includes('File formats:')) {
        inFormatsSection = true;
        continue;
      }

      if (!inFormatsSection || !line.trim()) continue;
      if (line.startsWith(' --')) break;

      const match = line.match(/^\s*([DE\s]{2})\s+(\S+)\s+(.+)$/);
      if (match) {
        const [, flags, name, description] = match;
        const canDemux = flags.includes('D');
        const canMux = flags.includes('E');

        formats.push({
          name,
          longName: description.trim(),
          extensions: this.guessExtensions(name),
          mimeTypes: this.guessMimeTypes(name),
          canDemux,
          canMux,
        });
      }
    }

    return formats;
  }

  /**
   * Parse codecs output
   */
  private parseCodecs(output: string): Codec[] {
    const codecs: Codec[] = [];
    const lines = output.split('\n');
    let inCodecsSection = false;

    for (const line of lines) {
      if (line.includes('Codecs:')) {
        inCodecsSection = true;
        continue;
      }

      if (!inCodecsSection || !line.trim()) continue;
      if (line.startsWith(' --')) break;

      const match = line.match(/^\s*([DEVALS\s]{6})\s+(\S+)\s+(.+)$/);
      if (match) {
        const [, flags, name, description] = match;
        const canDecode = flags[0] === 'D';
        const canEncode = flags[1] === 'E';
        const type =
          flags[2] === 'V' ? 'video' : flags[2] === 'A' ? 'audio' : 'subtitle';

        codecs.push({
          name,
          longName: description.trim(),
          type,
          canEncode,
          canDecode,
        });
      }
    }

    return codecs;
  }

  /**
   * Parse filters output
   */
  private parseFilters(output: string): Filter[] {
    const filters: Filter[] = [];
    const lines = output.split('\n');
    let inFiltersSection = false;

    for (const line of lines) {
      if (line.includes('Filters:')) {
        inFiltersSection = true;
        continue;
      }

      if (!inFiltersSection || !line.trim()) continue;
      if (line.startsWith(' --')) break;

      const match = line.match(
        /^\s*([TSC\s]{3})\s+(\S+)\s+(\d+)->(\d+)\s+(.+)$/
      );
      if (match) {
        const [, flags, name, inputs, outputs, description] = match;

        filters.push({
          name,
          description: description.trim(),
          inputs: parseInt(inputs),
          outputs: parseInt(outputs),
          timeline: flags.includes('T'),
          slice: flags.includes('S'),
          command: flags.includes('C'),
        });
      }
    }

    return filters;
  }

  /**
   * Guess file extensions for format
   */
  private guessExtensions(formatName: string): string[] {
    const extensionMap: Record<string, string[]> = {
      mp4: ['mp4', 'm4v'],
      avi: ['avi'],
      mkv: ['mkv'],
      mov: ['mov', 'qt'],
      wmv: ['wmv'],
      flv: ['flv'],
      webm: ['webm'],
      mp3: ['mp3'],
      wav: ['wav'],
      flac: ['flac'],
      aac: ['aac', 'm4a'],
      ogg: ['ogg', 'oga'],
    };

    return extensionMap[formatName] || [formatName];
  }

  /**
   * Guess MIME types for format
   */
  private guessMimeTypes(formatName: string): string[] {
    const mimeMap: Record<string, string[]> = {
      mp4: ['video/mp4'],
      avi: ['video/x-msvideo'],
      mkv: ['video/x-matroska'],
      mov: ['video/quicktime'],
      wmv: ['video/x-ms-wmv'],
      flv: ['video/x-flv'],
      webm: ['video/webm'],
      mp3: ['audio/mpeg'],
      wav: ['audio/wav'],
      flac: ['audio/flac'],
      aac: ['audio/aac'],
      ogg: ['audio/ogg'],
    };

    return mimeMap[formatName] || [];
  }

  /**
   * Extract progress from FFmpeg output
   */
  private extractProgress(output: string): number | null {
    const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    if (timeMatch) {
      // This would need duration context to calculate actual percentage
      // For now, return null - progress calculation needs more context
      return null;
    }
    return null;
  }

  /** Rich progress parse with optional duration */
  private extractProgressDetails(
    output: string,
    totalDurationSeconds?: number
  ): { percent: number | null; timeSeconds?: number; speed?: string } {
    const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    const speedMatch = output.match(/speed=([0-9.]+x)/);
    let timeSeconds: number | undefined;
    if (timeMatch) {
      const [, hh, mm, ss] = timeMatch as unknown as [string, string, string, string];
      timeSeconds = parseInt(hh) * 3600 + parseInt(mm) * 60 + parseFloat(ss);
    }
    let percent: number | null = null;
    if (timeSeconds !== undefined && totalDurationSeconds && totalDurationSeconds > 0) {
      percent = Math.max(0, Math.min(100, (timeSeconds / totalDurationSeconds) * 100));
    }
    const speed = speedMatch ? speedMatch[1] : undefined;
    return { percent, timeSeconds, speed };
  }

  private stripEnclosingQuotes(arg: string): string {
    if (!arg) return arg;
    let out = arg.trim();
    // Remove one level of matching single or double quotes around the whole token
    if ((out.startsWith('"') && out.endsWith('"')) || (out.startsWith("'") && out.endsWith("'"))) {
      out = out.slice(1, -1);
    }
    // Collapse double double-quotes at edges (e.g., ""path"")
    if (out.startsWith('"') && out[out.length - 1] === '"') {
      out = out.replace(/^"+/, '"').replace(/"+$/, '"');
      out = out.replace(/^"/, '').replace(/"$/, '');
    }
    return out;
  }

  /**
   * Extract warnings from FFmpeg output
   */
  private extractWarnings(output: string): string[] {
    const warnings: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.toLowerCase().includes('warning')) {
        warnings.push(line.trim());
      }
    }

    return warnings;
  }

  /** Parse a command string into argv honoring quotes */
  private parseCommandArgs(commandString: string): string[] {
    // Remove leading executable name if present
    const cleaned = commandString.replace(/^\s*ffmpeg\s+/, '');
    const args: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue; // do not include quotes in token
      }
      if (ch === ' ' && !inQuotes) {
        if (current.length > 0) {
          args.push(current);
          current = '';
        }
      } else {
        current += ch;
      }
    }
    if (current.length > 0) args.push(current);
    return args;
  }

  /**
   * Extract errors from FFmpeg output
   */
  private extractErrors(output: string): string[] {
    const errors: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (
        line.toLowerCase().includes('error') ||
        line.toLowerCase().includes('invalid')
      ) {
        errors.push(line.trim());
      }
    }

    return errors;
  }

  /**
   * Ensure FFmpeg is detected before operations
   */
  private async ensureFFmpegDetected(): Promise<void> {
    if (!this.ffmpegPath) {
      await this.detectFFmpeg();
    }
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_DURATION;
  }

  /**
   * Update cache timestamp
   */
  private updateCacheTimestamp(): void {
    this.cacheTimestamp = Date.now();
  }

  /**
   * Clear all cached data
   */
  private clearCache(): void {
    this.formatsCache = null;
    this.codecsCache = null;
    this.filtersCache = null;
    this.cacheTimestamp = 0;
  }
}

export const ffmpegService = new FFmpegService();
