import React, { useState, useEffect, useMemo } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import Card from './ui/Card';
import {
    OutputSettings as OutputSettingsType,
    Resolution,
    QualityPreset,
    Format,
    Codec,
    MediaFileInfo,
    FileSizeEstimate,
} from '../../types/services';
import styles from './OutputSettings.module.css';

interface OutputSettingsProps {
    selectedFiles: MediaFileInfo[];
    onSettingsChange: (settings: OutputSettingsType) => void;
    className?: string;
}

// Common resolutions
const COMMON_RESOLUTIONS: Resolution[] = [
    { width: 3840, height: 2160, label: '3840x2160 (4K UHD)' },
    { width: 2560, height: 1440, label: '2560x1440 (QHD)' },
    { width: 1920, height: 1080, label: '1920x1080 (Full HD)' },
    { width: 1280, height: 720, label: '1280x720 (HD)' },
    { width: 854, height: 480, label: '854x480 (SD)' },
    { width: 640, height: 360, label: '640x360 (nHD)' },
];

// Quality presets
const QUALITY_PRESETS: QualityPreset[] = [
    {
        id: 'ultra',
        name: 'Ultra Quality',
        description: 'Best quality, largest file size',
        settings: { crf: 18, preset: 'slow' },
        estimatedSizeMultiplier: 2.5,
    },
    {
        id: 'high',
        name: 'High Quality',
        description: 'Great quality, balanced file size',
        settings: { crf: 23, preset: 'medium' },
        estimatedSizeMultiplier: 1.5,
    },
    {
        id: 'medium',
        name: 'Medium Quality',
        description: 'Good quality, moderate file size',
        settings: { crf: 28, preset: 'medium' },
        estimatedSizeMultiplier: 1.0,
    },
    {
        id: 'low',
        name: 'Low Quality',
        description: 'Acceptable quality, small file size',
        settings: { crf: 35, preset: 'fast' },
        estimatedSizeMultiplier: 0.5,
    },
    {
        id: 'web',
        name: 'Web Optimized',
        description: 'Optimized for web streaming',
        settings: { videoBitrate: 2000, audioBitrate: 128, preset: 'fast' },
        estimatedSizeMultiplier: 0.8,
    },
];

// Format to codec mappings
type FormatCodecMapping = {
    videoCodecs: string[];
    audioCodecs: string[];
    defaultVideoCodec?: string;
    defaultAudioCodec?: string;
};

const FORMAT_CODEC_MAPPINGS: Record<string, FormatCodecMapping> = {
    mp4: {
        videoCodecs: ['libx264', 'libx265', 'libvpx-vp9'],
        audioCodecs: ['aac', 'mp3', 'libopus'],
        defaultVideoCodec: 'libx264',
        defaultAudioCodec: 'aac',
    },
    mkv: {
        videoCodecs: ['libx264', 'libx265', 'libvpx-vp9', 'av1'],
        audioCodecs: ['aac', 'flac', 'libopus', 'ac3'],
        defaultVideoCodec: 'libx264',
        defaultAudioCodec: 'aac',
    },
    webm: {
        videoCodecs: ['libvpx', 'libvpx-vp9', 'av1'],
        audioCodecs: ['libvorbis', 'libopus'],
        defaultVideoCodec: 'libvpx-vp9',
        defaultAudioCodec: 'libopus',
    },
    avi: {
        videoCodecs: ['libx264', 'libxvid'],
        audioCodecs: ['mp3', 'ac3'],
        defaultVideoCodec: 'libx264',
        defaultAudioCodec: 'mp3',
    },
    mov: {
        videoCodecs: ['libx264', 'libx265', 'prores'],
        audioCodecs: ['aac', 'pcm_s16le'],
        defaultVideoCodec: 'libx264',
        defaultAudioCodec: 'aac',
    },
    // Audio-only formats
    mp3: {
        videoCodecs: [],
        audioCodecs: ['mp3'],
        defaultAudioCodec: 'mp3',
    },
    wav: {
        videoCodecs: [],
        audioCodecs: ['pcm_s16le', 'pcm_s24le'],
        defaultAudioCodec: 'pcm_s16le',
    },
    flac: {
        videoCodecs: [],
        audioCodecs: ['flac'],
        defaultAudioCodec: 'flac',
    },
    aac: {
        videoCodecs: [],
        audioCodecs: ['aac'],
        defaultAudioCodec: 'aac',
    },
    ogg: {
        videoCodecs: [],
        audioCodecs: ['libvorbis', 'libopus'],
        defaultAudioCodec: 'libvorbis',
    },
    // Special formats
    gif: {
        videoCodecs: ['gif'],
        audioCodecs: [],
        defaultVideoCodec: 'gif',
    },
};

const OutputSettings: React.FC<OutputSettingsProps> = ({
    selectedFiles,
    onSettingsChange,
    className,
}) => {
    const [formats, setFormats] = useState<Format[]>([]);
    const [codecs, setCodecs] = useState<Codec[]>([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<OutputSettingsType>({
        format: 'mp4',
        codec: 'libx264',
        quality: {
            crf: 23,
            preset: 'medium',
        },
        outputPath: '',
    });
    const [selectedPreset, setSelectedPreset] = useState<string>('high');

    // Determine if we're working with video or audio files
    const fileType = useMemo(() => {
        if (selectedFiles.length === 0) return 'unknown';
        const hasVideo = selectedFiles.some(file =>
            file.streams.some(stream => stream.type === 'video')
        );
        return hasVideo ? 'video' : 'audio';
    }, [selectedFiles]);

    // Load formats and codecs on mount
    useEffect(() => {
        const loadFFmpegData = async () => {
            try {
                setLoading(true);
                const [formatsResponse, codecsResponse] = await Promise.all([
                    window.electronAPI.ffmpeg.getFormats(),
                    window.electronAPI.ffmpeg.getCodecs(),
                ]);

                if (formatsResponse.success) {
                    setFormats(formatsResponse.data);
                }
                if (codecsResponse.success) {
                    setCodecs(codecsResponse.data);
                }
            } catch (error) {
                console.error('Failed to load FFmpeg data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadFFmpegData();
    }, []);

    // Set default output path based on the last added file
    useEffect(() => {
        if (selectedFiles.length > 0 && !settings.outputPath) {
            const lastFile = selectedFiles[selectedFiles.length - 1];
            const parentDirectory = lastFile.path.substring(0, lastFile.path.lastIndexOf('/') || lastFile.path.lastIndexOf('\\'));
            updateSettings({ outputPath: parentDirectory });
        }
    }, [selectedFiles, settings.outputPath]);

    // Get available formats based on file type
    const availableFormats = useMemo(() => {
        // If no formats loaded from FFmpeg, use fallback formats
        if (formats.length === 0) {
            const fallbackFormats = fileType === 'audio'
                ? [
                    { name: 'mp3', longName: 'MP3 (MPEG Audio Layer III)', extensions: ['mp3'], mimeTypes: ['audio/mpeg'], canDemux: true, canMux: true },
                    { name: 'wav', longName: 'WAV / WAVE (Waveform Audio)', extensions: ['wav'], mimeTypes: ['audio/wav'], canDemux: true, canMux: true },
                    { name: 'flac', longName: 'FLAC (Free Lossless Audio Codec)', extensions: ['flac'], mimeTypes: ['audio/flac'], canDemux: true, canMux: true },
                    { name: 'aac', longName: 'AAC (Advanced Audio Coding)', extensions: ['aac'], mimeTypes: ['audio/aac'], canDemux: true, canMux: true },
                    { name: 'ogg', longName: 'Ogg', extensions: ['ogg'], mimeTypes: ['audio/ogg'], canDemux: true, canMux: true }
                ]
                : [
                    { name: 'mp4', longName: 'MP4 (MPEG-4 Part 14)', extensions: ['mp4'], mimeTypes: ['video/mp4'], canDemux: true, canMux: true },
                    { name: 'mkv', longName: 'Matroska / WebM', extensions: ['mkv'], mimeTypes: ['video/x-matroska'], canDemux: true, canMux: true },
                    { name: 'webm', longName: 'WebM', extensions: ['webm'], mimeTypes: ['video/webm'], canDemux: true, canMux: true },
                    { name: 'avi', longName: 'AVI (Audio Video Interleaved)', extensions: ['avi'], mimeTypes: ['video/x-msvideo'], canDemux: true, canMux: true },
                    { name: 'mov', longName: 'QuickTime / MOV', extensions: ['mov'], mimeTypes: ['video/quicktime'], canDemux: true, canMux: true },
                    { name: 'gif', longName: 'GIF (Graphics Interchange Format)', extensions: ['gif'], mimeTypes: ['image/gif'], canDemux: true, canMux: true },
                    { name: 'mp3', longName: 'MP3 (MPEG Audio Layer III)', extensions: ['mp3'], mimeTypes: ['audio/mpeg'], canDemux: true, canMux: true }
                ];
            return fallbackFormats;
        }

        if (fileType === 'audio') {
            return formats.filter(format =>
                ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(format.name)
            );
        }
        return formats.filter(format =>
            ['mp4', 'mkv', 'webm', 'avi', 'mov', 'gif', 'mp3'].includes(format.name)
        );
    }, [formats, fileType]);

    // Get available codecs for selected format
    const availableCodecs = useMemo(() => {
        const mapping = FORMAT_CODEC_MAPPINGS[settings.format as keyof typeof FORMAT_CODEC_MAPPINGS];
        if (!mapping) return [];

        const codecNames = fileType === 'video'
            ? [...mapping.videoCodecs, ...mapping.audioCodecs]
            : mapping.audioCodecs;

        // If no codecs loaded from FFmpeg, use fallback codec data
        if (codecs.length === 0) {
            return codecNames.map(codecName => ({
                name: codecName,
                longName: codecName.toUpperCase(),
                type: mapping.videoCodecs.includes(codecName) ? 'video' as const : 'audio' as const,
                canEncode: true,
                canDecode: true,
            }));
        }

        return codecs.filter(codec =>
            codecNames.includes(codec.name) && codec.canEncode
        );
    }, [codecs, settings.format, fileType]);

    // Update settings and notify parent
    const updateSettings = (newSettings: Partial<OutputSettingsType>) => {
        const updatedSettings = { ...settings, ...newSettings };
        setSettings(updatedSettings);
        onSettingsChange(updatedSettings);
    };

    // Handle format change
    const handleFormatChange = (format: string) => {
        const mapping = FORMAT_CODEC_MAPPINGS[format as keyof typeof FORMAT_CODEC_MAPPINGS];
        if (!mapping) return;

        const defaultCodec = fileType === 'video'
            ? ('defaultVideoCodec' in mapping ? mapping.defaultVideoCodec : mapping.videoCodecs[0])
            : mapping.defaultAudioCodec || mapping.audioCodecs[0];

        updateSettings({
            format,
            codec: defaultCodec || settings.codec,
        });
    };

    // Handle preset change
    const handlePresetChange = (presetId: string) => {
        const preset = QUALITY_PRESETS.find(p => p.id === presetId);
        if (preset) {
            setSelectedPreset(presetId);
            updateSettings({
                quality: { ...settings.quality, ...preset.settings },
            });
        }
    };

    // Calculate estimated file size
    const estimatedFileSize = useMemo((): FileSizeEstimate => {
        if (selectedFiles.length === 0) {
            return {
                estimatedSize: 0,
                estimatedSizeFormatted: '0 MB',
                confidence: 'low',
            };
        }

        // Simple estimation based on bitrate or CRF
        const totalDuration = selectedFiles.reduce((sum, file) => sum + (file.duration || 0), 0);
        let estimatedBitrate = 0;

        if (settings.quality.videoBitrate && settings.quality.audioBitrate) {
            estimatedBitrate = settings.quality.videoBitrate + settings.quality.audioBitrate;
        } else if (settings.quality.crf) {
            // Rough estimation based on CRF
            const crfMultiplier = Math.max(0.1, (51 - settings.quality.crf) / 51);
            estimatedBitrate = fileType === 'video' ? 2000 * crfMultiplier : 128;
        } else {
            estimatedBitrate = fileType === 'video' ? 2000 : 128;
        }

        const estimatedSize = (estimatedBitrate * 1000 * totalDuration) / 8; // Convert to bytes
        const formatSize = (bytes: number): string => {
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
            return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        };

        return {
            estimatedSize,
            estimatedSizeFormatted: formatSize(estimatedSize),
            confidence: settings.quality.videoBitrate ? 'high' : 'medium',
        };
    }, [selectedFiles, settings.quality, fileType]);

    if (loading) {
        return (
            <Card className={`${styles.container} ${className || ''}`}>
                <div className={styles.loading}>Loading output settings...</div>
            </Card>
        );
    }

    return (
        <Card className={`${styles.container} ${className || ''}`}>
            <div className={styles.header}>
                <h3>Output Settings</h3>
                <p className={styles.subtitle}>
                    Configure format, quality, and encoding options
                </p>
            </div>

            <div className={styles.content}>
                {/* Format Selection */}
                <div className={styles.section}>
                    <label className={styles.label}>Output Format</label>
                    <Select
                        value={settings.format}
                        onChange={(e) => handleFormatChange(e.target.value)}
                        options={availableFormats.map(format => ({
                            value: format.name,
                            label: `${format.name.toUpperCase()} - ${format.longName}`,
                        }))}
                        className={styles.select}
                    />
                </div>

                {/* Codec Selection */}
                <div className={styles.section}>
                    <label className={styles.label}>Codec</label>
                    <Select
                        value={settings.codec}
                        onChange={(e) => updateSettings({ codec: e.target.value })}
                        options={availableCodecs.map(codec => ({
                            value: codec.name,
                            label: `${codec.name} - ${codec.longName}`,
                        }))}
                        className={styles.select}
                    />
                </div>

                {/* Quality Presets */}
                <div className={styles.section}>
                    <label className={styles.label}>Quality Preset</label>
                    <div className={styles.presets}>
                        {QUALITY_PRESETS.map(preset => (
                            <button
                                key={preset.id}
                                className={`${styles.preset} ${selectedPreset === preset.id ? styles.active : ''}`}
                                onClick={() => handlePresetChange(preset.id)}
                            >
                                <div className={styles.presetName}>{preset.name}</div>
                                <div className={styles.presetDescription}>{preset.description}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quality Settings */}
                <div className={styles.section}>
                    <label className={styles.label}>Quality Settings</label>
                    <div className={styles.qualityGrid}>
                        {fileType === 'video' && (
                            <>
                                {/* Video Bitrate */}
                                <div className={styles.inputGroup}>
                                    <label className={styles.inputLabel}>Video Bitrate (kbps)</label>
                                    <Input
                                        type="number"
                                        value={settings.quality.videoBitrate || ''}
                                        onChange={(e) => updateSettings({
                                            quality: {
                                                ...settings.quality,
                                                videoBitrate: e.target.value ? parseInt(e.target.value) : undefined,
                                            }
                                        })}
                                        placeholder="Auto"
                                        min="100"
                                        max="50000"
                                    />
                                </div>

                                {/* CRF */}
                                <div className={styles.inputGroup}>
                                    <label className={styles.inputLabel}>
                                        CRF (0-51, lower = better quality)
                                    </label>
                                    <Input
                                        type="range"
                                        min="0"
                                        max="51"
                                        value={settings.quality.crf || 23}
                                        onChange={(e) => updateSettings({
                                            quality: {
                                                ...settings.quality,
                                                crf: parseInt(e.target.value),
                                            }
                                        })}
                                        className={styles.slider}
                                    />
                                    <span className={styles.sliderValue}>{settings.quality.crf || 23}</span>
                                </div>

                                {/* Resolution */}
                                <div className={styles.inputGroup}>
                                    <label className={styles.inputLabel}>Resolution</label>
                                    <Select
                                        value={settings.quality.resolution ?
                                            `${settings.quality.resolution.width}x${settings.quality.resolution.height}` :
                                            'original'
                                        }
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === 'original') {
                                                updateSettings({
                                                    quality: { ...settings.quality, resolution: undefined }
                                                });
                                            } else {
                                                const resolution = COMMON_RESOLUTIONS.find(r =>
                                                    `${r.width}x${r.height}` === value
                                                );
                                                if (resolution) {
                                                    updateSettings({
                                                        quality: { ...settings.quality, resolution }
                                                    });
                                                }
                                            }
                                        }}
                                        options={[
                                            { value: 'original', label: 'Keep Original' },
                                            ...COMMON_RESOLUTIONS.map(res => ({
                                                value: `${res.width}x${res.height}`,
                                                label: res.label,
                                            }))
                                        ]}
                                    />
                                </div>

                                {/* Frame Rate */}
                                <div className={styles.inputGroup}>
                                    <label className={styles.inputLabel}>Frame Rate (fps)</label>
                                    <Input
                                        type="number"
                                        value={settings.quality.frameRate || ''}
                                        onChange={(e) => updateSettings({
                                            quality: {
                                                ...settings.quality,
                                                frameRate: e.target.value ? parseFloat(e.target.value) : undefined,
                                            }
                                        })}
                                        placeholder="Keep original"
                                        min="1"
                                        max="120"
                                        step="0.1"
                                    />
                                </div>
                            </>
                        )}

                        {/* Audio Bitrate */}
                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>Audio Bitrate (kbps)</label>
                            <Input
                                type="number"
                                value={settings.quality.audioBitrate || ''}
                                onChange={(e) => updateSettings({
                                    quality: {
                                        ...settings.quality,
                                        audioBitrate: e.target.value ? parseInt(e.target.value) : undefined,
                                    }
                                })}
                                placeholder="Auto"
                                min="32"
                                max="320"
                            />
                        </div>
                    </div>
                </div>

                {/* File Size Estimation */}
                <div className={styles.section}>
                    <div className={styles.estimation}>
                        <div className={styles.estimationLabel}>Estimated Output Size:</div>
                        <div className={styles.estimationValue}>
                            {estimatedFileSize.estimatedSizeFormatted}
                            <span className={styles.confidence}>
                                ({estimatedFileSize.confidence} confidence)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Output Path */}
                <div className={styles.section}>
                    <label className={styles.label}>Output Location</label>
                    <div className={styles.pathSelector}>
                        <Input
                            value={settings.outputPath}
                            onChange={(e) => updateSettings({ outputPath: e.target.value })}
                            placeholder="Choose output location..."
                            readOnly
                        />
                        <Button
                            variant="outline"
                            onClick={async () => {
                                const result = await window.electronAPI.dialog.selectOutputDirectory({
                                    title: 'Select Output Directory',
                                    defaultPath: settings.outputPath || undefined,
                                });
                                if (result.success && result.data) {
                                    updateSettings({ outputPath: result.data });
                                }
                            }}
                        >
                            Browse
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default OutputSettings;