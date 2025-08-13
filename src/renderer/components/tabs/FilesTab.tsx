import React from 'react';
import FileInputInterface from '../FileInputInterface';
import { MediaFileInfo } from '../../types/services';
import './TabContent.css';

interface FilesTabProps {
    onFilesChange: (files: MediaFileInfo[]) => void;
}

const FilesTab: React.FC<FilesTabProps> = ({ onFilesChange }) => {
    return (
        <div className="files-tab">
            <div className="tab-section">
                <h2>Select Media Files</h2>
                <p>Choose the video or audio files you want to process</p>
                <FileInputInterface
                    onFilesChange={onFilesChange}
                    maxFiles={10}
                />
            </div>
        </div>
    );
};

export default FilesTab;