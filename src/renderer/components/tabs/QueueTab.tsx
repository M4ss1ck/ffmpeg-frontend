import React from 'react';
import ProcessingQueue from '../ProcessingQueue';
import './TabContent.css';

interface QueueTabProps {
    onStateChange: (state: any) => void;
}

const QueueTab: React.FC<QueueTabProps> = ({ onStateChange }) => {
    return (
        <div className="queue-tab">
            <div className="tab-section">
                <h2>Processing Queue</h2>
                <p>Monitor and manage your conversion jobs</p>
                <ProcessingQueue onStateChange={onStateChange} />
            </div>
        </div>
    );
};

export default QueueTab;