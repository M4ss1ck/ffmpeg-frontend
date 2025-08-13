import React from 'react';
import OutputSettings from '../OutputSettings';
import { MediaFileInfo, OutputSettings as OutputSettingsType } from '../../types/services';
import './TabContent.css';

interface SettingsTabProps {
    selectedFiles: MediaFileInfo[];
    outputSettings: OutputSettingsType;
    onSettingsChange: (settings: OutputSettingsType) => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({
    selectedFiles,
    outputSettings,
    onSettingsChange
}) => {
    if (selectedFiles.length === 0) {
        return (
            <div className="tab-placeholder">
                <h2>Output Settings</h2>
                <p>Select files first to configure output settings</p>
            </div>
        );
    }

    return (
        <div className="settings-tab">
            <div className="tab-section">
                <h2>Output Settings</h2>
                <p>Configure format, codec, quality, and output location</p>
                <OutputSettings
                    selectedFiles={selectedFiles}
                    onSettingsChange={onSettingsChange}
                />
            </div>
        </div>
    );
};

export default SettingsTab;