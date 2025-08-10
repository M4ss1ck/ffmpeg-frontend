import React, { useRef, useState } from 'react';
import { useDragDrop } from '../utils/dragDropHandler';
import { Button } from './ui';
import { MediaFileInfo, DragDropEvent } from '../../types/services';
import styles from './FileDropZone.module.css';

interface FileDropZoneProps {
    onFilesAdded: (files: MediaFileInfo[]) => void;
    disabled?: boolean;
    maxFiles?: number;
    className?: string;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({
    onFilesAdded,
    disabled = false,
    maxFiles = 10,
    className = '',
}) => {
    const dropZoneRef = useRef<HTMLDivElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleDrop = async (event: DragDropEvent) => {
        if (disabled || isProcessing) return;

        setIsProcessing(true);
        try {
            // Validate and get file info for each dropped file
            const fileInfoPromises = event.files.map(async (file) => {
                try {
                    const response = await window.electronAPI.file.getInfo(file.path);
                    if (response.success && response.data) {
                        return response.data;
                    }
                    return null;
                } catch (error) {
                    console.error(`Failed to get info for file ${file.name}:`, error);
                    return null;
                }
            });

            const fileInfos = await Promise.all(fileInfoPromises);
            const validFiles = fileInfos.filter((info): info is MediaFileInfo => info !== null);

            if (validFiles.length > 0) {
                onFilesAdded(validFiles);
            }
        } catch (error) {
            console.error('Error processing dropped files:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileSelect = async () => {
        if (disabled || isProcessing) return;

        setIsProcessing(true);
        try {
            const response = await window.electronAPI.dialog.selectFiles({
                title: 'Select Media Files',
                properties: ['openFile', 'multiSelections'],
                filters: [
                    {
                        name: 'Video Files',
                        extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp'],
                    },
                    {
                        name: 'Audio Files',
                        extensions: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus'],
                    },
                    {
                        name: 'All Media Files',
                        extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp', 'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus'],
                    },
                ],
            });

            if (response.success && response.data && response.data.length > 0) {
                // Get file info for selected files
                const fileInfoPromises = response.data.map(async (filePath: string) => {
                    try {
                        const fileResponse = await window.electronAPI.file.getInfo(filePath);
                        if (fileResponse.success && fileResponse.data) {
                            return fileResponse.data;
                        }
                        return null;
                    } catch (error) {
                        console.error(`Failed to get info for file ${filePath}:`, error);
                        return null;
                    }
                });

                const fileInfos = await Promise.all(fileInfoPromises);
                const validFiles = fileInfos.filter((info): info is MediaFileInfo => info !== null);

                if (validFiles.length > 0) {
                    onFilesAdded(validFiles);
                }
            }
        } catch (error) {
            console.error('Error selecting files:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const { isDragOver } = useDragDrop(dropZoneRef, {
        onDrop: handleDrop,
        maxFiles,
        acceptedTypes: ['video/*', 'audio/*'],
    });

    const dropZoneClasses = [
        styles.dropZone,
        isDragOver && styles.dragOver,
        disabled && styles.disabled,
        isProcessing && styles.processing,
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            ref={dropZoneRef}
            className={dropZoneClasses}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label="Drop files here or click to select"
            onClick={handleFileSelect}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleFileSelect();
                }
            }}
        >
            <div className={styles.content}>
                <div className={styles.icon}>
                    {isProcessing ? (
                        <div className={styles.spinner} />
                    ) : (
                        <svg
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7,10 12,15 17,10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                    )}
                </div>

                <div className={styles.text}>
                    <h3 className={styles.title}>
                        {isProcessing ? 'Processing files...' : 'Drop your media files here'}
                    </h3>
                    <p className={styles.subtitle}>
                        {isProcessing
                            ? 'Please wait while we analyze your files'
                            : 'Supports video and audio files up to 10GB each'
                        }
                    </p>
                </div>

                {!isProcessing && (
                    <Button
                        variant="outline"
                        disabled={disabled}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleFileSelect();
                        }}
                    >
                        Browse Files
                    </Button>
                )}
            </div>

            {isDragOver && (
                <div className={styles.overlay}>
                    <div className={styles.overlayContent}>
                        <div className={styles.overlayIcon}>
                            <svg
                                width="32"
                                height="32"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7,10 12,15 17,10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                        </div>
                        <p>Drop files to add them</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileDropZone;