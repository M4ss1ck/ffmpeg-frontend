import { DragDropFile, DragDropEvent } from '../../types/services';

export interface DragDropOptions {
    onDragEnter?: (event: DragEvent) => void;
    onDragOver?: (event: DragEvent) => void;
    onDragLeave?: (event: DragEvent) => void;
    onDrop?: (event: DragDropEvent) => void;
    acceptedTypes?: string[];
    maxFiles?: number;
    maxFileSize?: number; // in bytes
}

export class DragDropHandler {
    private element: HTMLElement;
    private options: DragDropOptions;
    private dragCounter = 0;

    constructor(element: HTMLElement, options: DragDropOptions = {}) {
        this.element = element;
        this.options = {
            acceptedTypes: ['video/*', 'audio/*'],
            maxFiles: 10,
            maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
            ...options
        };

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Prevent default drag behaviors on the document
        document.addEventListener('dragenter', this.preventDefaults);
        document.addEventListener('dragover', this.preventDefaults);
        document.addEventListener('dragleave', this.preventDefaults);
        document.addEventListener('drop', this.preventDefaults);

        // Add event listeners to the target element
        this.element.addEventListener('dragenter', this.handleDragEnter.bind(this));
        this.element.addEventListener('dragover', this.handleDragOver.bind(this));
        this.element.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.element.addEventListener('drop', this.handleDrop.bind(this));
    }

    private preventDefaults = (e: Event): void => {
        e.preventDefault();
        e.stopPropagation();
    };

    private handleDragEnter = (e: DragEvent): void => {
        this.preventDefaults(e);
        this.dragCounter++;

        if (this.dragCounter === 1) {
            this.element.classList.add('drag-over');
            this.options.onDragEnter?.(e);
        }
    };

    private handleDragOver = (e: DragEvent): void => {
        this.preventDefaults(e);
        this.options.onDragOver?.(e);
    };

    private handleDragLeave = (e: DragEvent): void => {
        this.preventDefaults(e);
        this.dragCounter--;

        if (this.dragCounter === 0) {
            this.element.classList.remove('drag-over');
            this.options.onDragLeave?.(e);
        }
    };

    private handleDrop = async (e: DragEvent): Promise<void> => {
        this.preventDefaults(e);
        this.dragCounter = 0;
        this.element.classList.remove('drag-over');

        const files = this.extractFilesFromEvent(e);
        if (files.length === 0) return;

        // Validate files
        const validatedFiles = await this.validateFiles(files);
        if (validatedFiles.length === 0) return;

        const dropEvent: DragDropEvent = {
            files: validatedFiles,
            x: e.clientX,
            y: e.clientY
        };

        this.options.onDrop?.(dropEvent);
    };

    private extractFilesFromEvent(e: DragEvent): File[] {
        const files: File[] = [];

        if (e.dataTransfer?.files) {
            for (let i = 0; i < e.dataTransfer.files.length; i++) {
                const file = e.dataTransfer.files[i];
                if (file) {
                    files.push(file);
                }
            }
        }

        return files;
    }

    private async validateFiles(files: File[]): Promise<DragDropFile[]> {
        const validFiles: DragDropFile[] = [];

        for (const file of files) {
            // Check file count limit
            if (this.options.maxFiles && validFiles.length >= this.options.maxFiles) {
                console.warn(`Maximum file limit reached (${this.options.maxFiles})`);
                break;
            }

            // Check file size
            if (this.options.maxFileSize && file.size > this.options.maxFileSize) {
                console.warn(`File ${file.name} is too large (${this.formatFileSize(file.size)})`);
                continue;
            }

            // Check file type
            if (this.options.acceptedTypes && !this.isFileTypeAccepted(file)) {
                console.warn(`File type not accepted: ${file.type || 'unknown'}`);
                continue;
            }

            // Check if file is supported by our services
            try {
                const supportInfo = await window.electronAPI.file.isSupported(file.path || file.name);
                if (!supportInfo.success || !supportInfo.data?.isSupported) {
                    console.warn(`File ${file.name} is not supported`);
                    continue;
                }
            } catch (error) {
                console.warn(`Error checking file support for ${file.name}:`, error);
                continue;
            }

            validFiles.push({
                path: (file as any).path || file.name, // Electron provides path property
                name: file.name,
                type: file.type,
                size: file.size
            });
        }

        return validFiles;
    }

    private isFileTypeAccepted(file: File): boolean {
        if (!this.options.acceptedTypes || this.options.acceptedTypes.length === 0) {
            return true;
        }

        const fileType = file.type.toLowerCase();
        const fileName = file.name.toLowerCase();

        return this.options.acceptedTypes.some(acceptedType => {
            const type = acceptedType.toLowerCase();

            // Handle wildcard types (e.g., "video/*", "audio/*")
            if (type.endsWith('/*')) {
                const baseType = type.slice(0, -2);
                return fileType.startsWith(baseType);
            }

            // Handle specific MIME types
            if (type.includes('/')) {
                return fileType === type;
            }

            // Handle file extensions
            if (type.startsWith('.')) {
                return fileName.endsWith(type);
            }

            return false;
        });
    }

    private formatFileSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    public destroy(): void {
        // Remove event listeners
        document.removeEventListener('dragenter', this.preventDefaults);
        document.removeEventListener('dragover', this.preventDefaults);
        document.removeEventListener('dragleave', this.preventDefaults);
        document.removeEventListener('drop', this.preventDefaults);

        this.element.removeEventListener('dragenter', this.handleDragEnter);
        this.element.removeEventListener('dragover', this.handleDragOver);
        this.element.removeEventListener('dragleave', this.handleDragLeave);
        this.element.removeEventListener('drop', this.handleDrop);

        // Clean up classes
        this.element.classList.remove('drag-over');
    }

    public updateOptions(newOptions: Partial<DragDropOptions>): void {
        this.options = { ...this.options, ...newOptions };
    }
}

// React hook for drag and drop
export const useDragDrop = (
    elementRef: React.RefObject<HTMLElement>,
    options: DragDropOptions
) => {
    const [isDragOver, setIsDragOver] = React.useState(false);
    const handlerRef = React.useRef<DragDropHandler | null>(null);

    React.useEffect(() => {
        if (!elementRef.current) return;

        const enhancedOptions: DragDropOptions = {
            ...options,
            onDragEnter: (e) => {
                setIsDragOver(true);
                options.onDragEnter?.(e);
            },
            onDragLeave: (e) => {
                setIsDragOver(false);
                options.onDragLeave?.(e);
            },
            onDrop: (e) => {
                setIsDragOver(false);
                options.onDrop?.(e);
            }
        };

        handlerRef.current = new DragDropHandler(elementRef.current, enhancedOptions);

        return () => {
            handlerRef.current?.destroy();
        };
    }, [elementRef.current]);

    React.useEffect(() => {
        if (handlerRef.current) {
            handlerRef.current.updateOptions(options);
        }
    }, [options]);

    return { isDragOver };
};

// Import React for the hook
import React from 'react';