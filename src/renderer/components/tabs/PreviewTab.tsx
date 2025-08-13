import React from 'react';
import CommandPreview from '../CommandPreview';
import Button from '../ui/Button';
import { GeneratedCommand, MediaFileInfo, OutputSettings, FilterConfig } from '../../types/services';
import './TabContent.css';

interface PreviewTabProps {
    generatedCommand: GeneratedCommand | null;
    selectedFiles: MediaFileInfo[];
    outputSettings: OutputSettings;
    filters: FilterConfig[];
    isProcessing: boolean;
    overallProgress: number;
    onCommandEdit: (editedCommand: string) => Promise<void>;
    onStartConversion: () => Promise<void>;
    onCancelConversion: () => Promise<void>;
}

const PreviewTab: React.FC<PreviewTabProps> = ({
    generatedCommand,
    selectedFiles,
    outputSettings,
    filters,
    isProcessing,
    overallProgress,
    onCommandEdit,
    onStartConversion,
    onCancelConversion
}) => {
    if (!generatedCommand || selectedFiles.length === 0) {
        return (
            <div className="tab-placeholder">
                <h2>Command Preview</h2>
                <p>Configure your files and settings to preview the FFmpeg command</p>
            </div>
        );
    }

    const activeFilters = filters.filter(f => f.enabled);

    return (
        <div className="preview-tab">
            <div className="tab-section">
                <h2>Command Preview</h2>
                <p>Review and edit the generated FFmpeg command before processing</p>

                <CommandPreview
                    command={generatedCommand}
                    onCommandEdit={onCommandEdit}
                    onCopyCommand={() => {
                        console.log('Command copied to clipboard');
                    }}
                />
            </div>

            <div className="tab-section">
                <div className="conversion-summary">
                    <h3>Conversion Summary</h3>
                    <div className="summary-grid">
                        <div className="summary-item">
                            <span className="summary-label">Files:</span>
                            <span className="summary-value">{selectedFiles.length}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Output Format:</span>
                            <span className="summary-value">{outputSettings.format.toUpperCase()}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Codec:</span>
                            <span className="summary-value">{outputSettings.codec}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Active Filters:</span>
                            <span className="summary-value">{activeFilters.length}</span>
                        </div>
                    </div>
                </div>

                {outputSettings.outputPath && (
                    <div className={`conversion-ready ${isProcessing ? 'processing' : ''}`}>
                        <p className="conversion-ready-text">
                            Ready to convert {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} to {outputSettings.format.toUpperCase()}
                            {activeFilters.length > 0 && ` with ${activeFilters.length} filter(s)`}
                        </p>

                        {isProcessing && (
                            <div className="progress-container">
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${overallProgress}%` }}
                                    />
                                </div>
                                <div className="progress-text">
                                    {overallProgress > 0 ? `${Math.round(overallProgress)}%` : 'Starting conversion...'}
                                </div>
                            </div>
                        )}

                        <div className="conversion-actions">
                            {!isProcessing ? (
                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={onStartConversion}
                                >
                                    Start Conversion
                                </Button>
                            ) : (
                                <Button
                                    variant="danger-outline"
                                    size="lg"
                                    onClick={onCancelConversion}
                                >
                                    Cancel Conversion
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PreviewTab;