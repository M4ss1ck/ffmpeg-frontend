import React, { useState } from 'react';
import { MediaFileInfo, StreamInfo } from '../../types/services';
import { Card, Button } from './ui';
import styles from './FileList.module.css';

interface FileListProps {
    files: MediaFileInfo[];
    onRemoveFile: (index: number) => void;
    onReorderFiles: (fromIndex: number, toIndex: number) => void;
    onClearAll: () => void;
    className?: string;
}

interface FileItemProps {
    file: MediaFileInfo;
    onRemove: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
}

const FileItem: React.FC<FileItemProps> = ({
    file,
    onRemove,
    onMoveUp,
    onMoveDown,
    canMoveUp,
    canMoveDown,
}) => {
    const [showDetails, setShowDetails] = useState(false);

    const formatFileSize = (bytes: number): string => {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    };

    const formatDuration = (seconds?: number): string => {
        if (!seconds || seconds === 0) return 'Unknown';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const getFileType = (): 'video' | 'audio' => {
        const videoStreams = file.streams.filter(s => s.type === 'video');
        return videoStreams.length > 0 ? 'video' : 'audio';
    };

    const getPrimaryVideoStream = (): StreamInfo | null => {
        return file.streams.find(s => s.type === 'video') || null;
    };

    const getPrimaryAudioStream = (): StreamInfo | null => {
        return file.streams.find(s => s.type === 'audio') || null;
    };

    const fileType = getFileType();
    const videoStream = getPrimaryVideoStream();
    const audioStream = getPrimaryAudioStream();

    return (
        <Card className={styles.fileItem} padding="md">
            <div className={styles.fileHeader}>
                <div className={styles.fileIcon}>
                    {fileType === 'video' ? (
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polygon points="23 7 16 12 23 17 23 7" />
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                    ) : (
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M9 18V5l12-2v13" />
                            <circle cx="6" cy="18" r="3" />
                            <circle cx="18" cy="16" r="3" />
                        </svg>
                    )}
                </div>

                <div className={styles.fileInfo}>
                    <h4 className={styles.fileName} title={file.path}>
                        {file.name}
                    </h4>
                    <div className={styles.fileMetadata}>
                        <span className={styles.metadataItem}>
                            {file.format.toUpperCase()}
                        </span>
                        <span className={styles.metadataItem}>
                            {formatFileSize(file.size)}
                        </span>
                        <span className={styles.metadataItem}>
                            {formatDuration(file.duration)}
                        </span>
                        {videoStream && (
                            <span className={styles.metadataItem}>
                                {videoStream.width}×{videoStream.height}
                            </span>
                        )}
                    </div>
                </div>

                <div className={styles.fileActions}>
                    <button
                        className={styles.actionButton}
                        onClick={() => setShowDetails(!showDetails)}
                        title={showDetails ? 'Hide details' : 'Show details'}
                        aria-label={showDetails ? 'Hide details' : 'Show details'}
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={showDetails ? styles.rotated : ''}
                        >
                            <polyline points="6,9 12,15 18,9" />
                        </svg>
                    </button>

                    <button
                        className={styles.actionButton}
                        onClick={onMoveUp}
                        disabled={!canMoveUp}
                        title="Move up"
                        aria-label="Move file up"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="18,15 12,9 6,15" />
                        </svg>
                    </button>

                    <button
                        className={styles.actionButton}
                        onClick={onMoveDown}
                        disabled={!canMoveDown}
                        title="Move down"
                        aria-label="Move file down"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="6,9 12,15 18,9" />
                        </svg>
                    </button>

                    <button
                        className={`${styles.actionButton} ${styles.removeButton}`}
                        onClick={onRemove}
                        title="Remove file"
                        aria-label="Remove file"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="3,6 5,6 21,6" />
                            <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2" />
                        </svg>
                    </button>
                </div>
            </div>

            {showDetails && (
                <div className={styles.fileDetails}>
                    <div className={styles.detailsGrid}>
                        <div className={styles.detailSection}>
                            <h5 className={styles.sectionTitle}>File Information</h5>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Path:</span>
                                <span className={styles.detailValue} title={file.path}>
                                    {file.path}
                                </span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Size:</span>
                                <span className={styles.detailValue}>
                                    {formatFileSize(file.size)}
                                </span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Duration:</span>
                                <span className={styles.detailValue}>
                                    {formatDuration(file.duration)}
                                </span>
                            </div>
                        </div>

                        {videoStream && (
                            <div className={styles.detailSection}>
                                <h5 className={styles.sectionTitle}>Video Stream</h5>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Codec:</span>
                                    <span className={styles.detailValue}>{videoStream.codec}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Resolution:</span>
                                    <span className={styles.detailValue}>
                                        {videoStream.width}×{videoStream.height}
                                    </span>
                                </div>
                                {videoStream.frameRate && (
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Frame Rate:</span>
                                        <span className={styles.detailValue}>
                                            {videoStream.frameRate.toFixed(2)} fps
                                        </span>
                                    </div>
                                )}
                                {videoStream.bitrate && (
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Bitrate:</span>
                                        <span className={styles.detailValue}>
                                            {Math.round(videoStream.bitrate / 1000)} kbps
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {audioStream && (
                            <div className={styles.detailSection}>
                                <h5 className={styles.sectionTitle}>Audio Stream</h5>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Codec:</span>
                                    <span className={styles.detailValue}>{audioStream.codec}</span>
                                </div>
                                {audioStream.sampleRate && (
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Sample Rate:</span>
                                        <span className={styles.detailValue}>
                                            {audioStream.sampleRate} Hz
                                        </span>
                                    </div>
                                )}
                                {audioStream.channels && (
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Channels:</span>
                                        <span className={styles.detailValue}>
                                            {audioStream.channels}
                                        </span>
                                    </div>
                                )}
                                {audioStream.bitrate && (
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Bitrate:</span>
                                        <span className={styles.detailValue}>
                                            {Math.round(audioStream.bitrate / 1000)} kbps
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {Object.keys(file.metadata).length > 0 && (
                        <div className={styles.metadataSection}>
                            <h5 className={styles.sectionTitle}>Metadata</h5>
                            <div className={styles.metadataGrid}>
                                {Object.entries(file.metadata).map(([key, value]) => (
                                    <div key={key} className={styles.detailItem}>
                                        <span className={styles.detailLabel}>
                                            {key.charAt(0).toUpperCase() + key.slice(1)}:
                                        </span>
                                        <span className={styles.detailValue}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};

const FileList: React.FC<FileListProps> = ({
    files,
    onRemoveFile,
    onReorderFiles,
    onClearAll,
    className = '',
}) => {
    if (files.length === 0) {
        return null;
    }

    const handleMoveUp = (index: number) => {
        if (index > 0) {
            onReorderFiles(index, index - 1);
        }
    };

    const handleMoveDown = (index: number) => {
        if (index < files.length - 1) {
            onReorderFiles(index, index + 1);
        }
    };

    return (
        <div className={`${styles.fileList} ${className}`}>
            <div className={styles.listHeader}>
                <h3 className={styles.listTitle}>
                    Selected Files ({files.length})
                </h3>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onClearAll}
                    className={styles.clearButton}
                >
                    Clear All
                </Button>
            </div>

            <div className={styles.listContent}>
                {files.map((file, index) => (
                    <FileItem
                        key={`${file.path}-${index}`}
                        file={file}
                        onRemove={() => onRemoveFile(index)}
                        onMoveUp={() => handleMoveUp(index)}
                        onMoveDown={() => handleMoveDown(index)}
                        canMoveUp={index > 0}
                        canMoveDown={index < files.length - 1}
                    />
                ))}
            </div>
        </div>
    );
};

export default FileList;