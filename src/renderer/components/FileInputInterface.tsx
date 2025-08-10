import React, { useState, useCallback } from 'react';
import { MediaFileInfo } from '../../types/services';
import FileDropZone from './FileDropZone';
import FileList from './FileList';
import styles from './FileInputInterface.module.css';

interface FileInputInterfaceProps {
    onFilesChange?: (files: MediaFileInfo[]) => void;
    maxFiles?: number;
    className?: string;
}

const FileInputInterface: React.FC<FileInputInterfaceProps> = ({
    onFilesChange,
    maxFiles = 10,
    className = '',
}) => {
    const [files, setFiles] = useState<MediaFileInfo[]>([]);

    const handleFilesAdded = useCallback((newFiles: MediaFileInfo[]) => {
        setFiles(currentFiles => {
            // Prevent duplicates based on file path
            const existingPaths = new Set(currentFiles.map(f => f.path));
            const uniqueNewFiles = newFiles.filter(f => !existingPaths.has(f.path));

            // Respect max files limit
            const availableSlots = maxFiles - currentFiles.length;
            const filesToAdd = uniqueNewFiles.slice(0, availableSlots);

            if (filesToAdd.length < uniqueNewFiles.length) {
                console.warn(`Only ${filesToAdd.length} files added. Maximum of ${maxFiles} files allowed.`);
            }

            const updatedFiles = [...currentFiles, ...filesToAdd];
            onFilesChange?.(updatedFiles);
            return updatedFiles;
        });
    }, [maxFiles, onFilesChange]);

    const handleRemoveFile = useCallback((index: number) => {
        setFiles(currentFiles => {
            const updatedFiles = currentFiles.filter((_, i) => i !== index);
            onFilesChange?.(updatedFiles);
            return updatedFiles;
        });
    }, [onFilesChange]);

    const handleReorderFiles = useCallback((fromIndex: number, toIndex: number) => {
        setFiles(currentFiles => {
            const updatedFiles = [...currentFiles];
            const [movedFile] = updatedFiles.splice(fromIndex, 1);
            updatedFiles.splice(toIndex, 0, movedFile);
            onFilesChange?.(updatedFiles);
            return updatedFiles;
        });
    }, [onFilesChange]);

    const handleClearAll = useCallback(() => {
        setFiles([]);
        onFilesChange?.([]);
    }, [onFilesChange]);

    const hasFiles = files.length > 0;
    const isAtMaxCapacity = files.length >= maxFiles;

    return (
        <div className={`${styles.fileInputInterface} ${className}`}>
            <div className={styles.dropZoneContainer}>
                <FileDropZone
                    onFilesAdded={handleFilesAdded}
                    disabled={isAtMaxCapacity}
                    maxFiles={maxFiles - files.length}
                />

                {isAtMaxCapacity && (
                    <div className={styles.maxFilesWarning}>
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
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        Maximum of {maxFiles} files reached. Remove files to add more.
                    </div>
                )}
            </div>

            {hasFiles && (
                <div className={styles.fileListContainer}>
                    <FileList
                        files={files}
                        onRemoveFile={handleRemoveFile}
                        onReorderFiles={handleReorderFiles}
                        onClearAll={handleClearAll}
                    />
                </div>
            )}

            {hasFiles && (
                <div className={styles.summary}>
                    <div className={styles.summaryStats}>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Files:</span>
                            <span className={styles.statValue}>{files.length}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Total Size:</span>
                            <span className={styles.statValue}>
                                {formatTotalSize(files.reduce((sum, file) => sum + file.size, 0))}
                            </span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Total Duration:</span>
                            <span className={styles.statValue}>
                                {formatTotalDuration(files.reduce((sum, file) => sum + (file.duration || 0), 0))}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper functions
const formatTotalSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const formatTotalDuration = (seconds: number): string => {
    if (seconds === 0) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export default FileInputInterface;