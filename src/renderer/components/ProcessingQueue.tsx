import React, { useState, useEffect, useRef } from 'react';
import Button from './ui/Button';
import Progress from './ui/Progress';
import { QueueState, JobStatus } from '../../types/services';
import styles from './ProcessingQueue.module.css';

interface ProcessingQueueProps {
    className?: string;
    onStateChange?: (state: QueueState) => void;
}

const ProcessingQueue: React.FC<ProcessingQueueProps> = ({ className, onStateChange }) => {
    const [queueState, setQueueState] = useState<QueueState>({
        jobs: [],
        isRunning: false,
    });
    const [isExpanded, setIsExpanded] = useState(false);
    const [notifications, setNotifications] = useState<Array<{
        id: string;
        type: 'success' | 'error' | 'info';
        message: string;
        timestamp: number;
    }>>([]);

    // Track which job completions we've already shown notifications for
    const notifiedJobsRef = useRef<Set<string>>(new Set());
    const listenersRegisteredRef = useRef<boolean>(false);

    // Load initial queue state
    useEffect(() => {
        loadQueueState();
    }, []);

    // Set up event listeners
    useEffect(() => {
        const handleStateChange = (event: { state: QueueState }) => {
            setQueueState(event.state);
            // Call the parent callback if provided
            onStateChange?.(event.state);
        };

        const handleJobComplete = (event: { jobId: string; success: boolean; error?: string }) => {
            // Only show notification if we haven't already shown one for this job
            if (!notifiedJobsRef.current.has(event.jobId)) {
                notifiedJobsRef.current.add(event.jobId);

                setQueueState(currentState => {
                    const job = currentState.jobs.find(j => j.id === event.jobId);
                    if (job) {
                        const fileName = getFileName(job.inputFile);
                        // Only show notifications for actual completions/failures, not cancellations
                        if (event.success && job.status === 'completed') {
                            addNotification('success', `${fileName} converted successfully`);
                        } else if (!event.success && job.status === 'failed') {
                            addNotification('error', `${fileName} conversion failed: ${event.error || 'Unknown error'}`);
                        }
                        // Don't show notifications for cancelled jobs
                    }
                    return currentState;
                });
            }
        };

        // Register event listeners only once per component instance
        if (window.electronAPI?.queue && !listenersRegisteredRef.current) {
            window.electronAPI.queue.onStateChange(handleStateChange);
            window.electronAPI.queue.onJobComplete(handleJobComplete);
            listenersRegisteredRef.current = true;
        }

        // No cleanup available, but we only register once
    }, []); // Empty dependency array to run only once

    const loadQueueState = async () => {
        try {
            const result = await window.electronAPI?.queue?.getState();
            if (result?.success) {
                setQueueState(result.data);
            }
        } catch (error) {
            console.error('Failed to load queue state:', error);
        }
    };

    const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
        const notification = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            message,
            timestamp: Date.now(),
        };

        setNotifications(prev => [...prev, notification]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 5000);
    };

    const handleStartQueue = async () => {
        try {
            await window.electronAPI?.queue?.start({
                retryOnFail: true,
                maxRetriesPerJob: 2,
            });
        } catch (error) {
            console.error('Failed to start queue:', error);
            addNotification('error', 'Failed to start processing queue');
        }
    };

    const handleStopQueue = async () => {
        try {
            await window.electronAPI?.queue?.stop();
        } catch (error) {
            console.error('Failed to stop queue:', error);
            addNotification('error', 'Failed to stop processing queue');
        }
    };

    const handleClearQueue = async () => {
        if (!confirm('Are you sure you want to clear all jobs from the queue?')) {
            return;
        }

        try {
            await window.electronAPI?.queue?.clear();
        } catch (error) {
            console.error('Failed to clear queue:', error);
            addNotification('error', 'Failed to clear queue');
        }
    };

    const handleRetryJob = async (jobId: string) => {
        try {
            await window.electronAPI?.queue?.retryJob(jobId);
        } catch (error) {
            console.error('Failed to retry job:', error);
            addNotification('error', 'Failed to retry job');
        }
    };

    const handleCancelJob = async (jobId: string) => {
        try {
            await window.electronAPI?.queue?.cancelJob(jobId);
        } catch (error) {
            console.error('Failed to cancel job:', error);
            addNotification('error', 'Failed to cancel job');
        }
    };

    const handleRemoveJob = async (jobId: string) => {
        try {
            await window.electronAPI?.queue?.removeJob(jobId);
        } catch (error) {
            console.error('Failed to remove job:', error);
            addNotification('error', 'Failed to remove job');
        }
    };

    const getFileName = (filePath: string): string => {
        return filePath.split(/[/\\]/).pop() || filePath;
    };

    const getStatusIcon = (status: JobStatus): string => {
        switch (status) {
            case 'queued': return '⏳';
            case 'running': return '▶️';
            case 'completed': return '✅';
            case 'failed': return '❌';
            case 'canceled': return '⏹️';
            default: return '❓';
        }
    };

    const getStatusColor = (status: JobStatus): string => {
        switch (status) {
            case 'queued': return 'var(--color-text-secondary)';
            case 'running': return 'var(--color-primary)';
            case 'completed': return 'var(--color-success)';
            case 'failed': return 'var(--color-error)';
            case 'canceled': return 'var(--color-warning)';
            default: return 'var(--color-text-secondary)';
        }
    };

    const formatDuration = (seconds: number): string => {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
        return `${Math.round(seconds / 3600)}h`;
    };

    const formatETA = (etaSeconds?: number): string => {
        if (!etaSeconds || etaSeconds <= 0) return '';
        return `ETA: ${formatDuration(etaSeconds)}`;
    };

    const getJobStats = () => {
        const stats = {
            total: queueState.jobs.length,
            queued: queueState.jobs.filter(j => j.status === 'queued').length,
            running: queueState.jobs.filter(j => j.status === 'running').length,
            completed: queueState.jobs.filter(j => j.status === 'completed').length,
            failed: queueState.jobs.filter(j => j.status === 'failed').length,
        };
        return stats;
    };

    const stats = getJobStats();
    const hasJobs = queueState.jobs.length > 0;
    const hasQueuedJobs = stats.queued > 0;

    return (
        <div className={`${styles.processingQueue} ${className || ''}`}>
            {/* Notifications */}
            {notifications.length > 0 && (
                <div className={styles.notifications}>
                    {notifications.map(notification => (
                        <div
                            key={notification.id}
                            className={`${styles.notification} ${styles[notification.type]}`}
                        >
                            <span className={styles.notificationMessage}>{notification.message}</span>
                            <button
                                className={styles.notificationClose}
                                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Queue Header */}
            <div className={styles.queueHeader}>
                <div className={styles.queueTitle}>
                    <h3>Processing Queue</h3>
                    {hasJobs && (
                        <div className={styles.queueStats}>
                            <span className={styles.statItem}>
                                {stats.total} total
                            </span>
                            {stats.running > 0 && (
                                <span className={styles.statItem} style={{ color: 'var(--color-primary)' }}>
                                    {stats.running} running
                                </span>
                            )}
                            {stats.queued > 0 && (
                                <span className={styles.statItem}>
                                    {stats.queued} queued
                                </span>
                            )}
                            {stats.completed > 0 && (
                                <span className={styles.statItem} style={{ color: 'var(--color-success)' }}>
                                    {stats.completed} completed
                                </span>
                            )}
                            {stats.failed > 0 && (
                                <span className={styles.statItem} style={{ color: 'var(--color-error)' }}>
                                    {stats.failed} failed
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.queueControls}>
                    {hasQueuedJobs && !queueState.isRunning && (
                        <Button variant="primary" size="sm" onClick={handleStartQueue}>
                            Start Queue
                        </Button>
                    )}
                    {queueState.isRunning && (
                        <Button variant="outline" size="sm" onClick={handleStopQueue}>
                            Stop Queue
                        </Button>
                    )}
                    {hasJobs && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsExpanded(!isExpanded)}
                            >
                                {isExpanded ? 'Collapse' : 'Expand'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleClearQueue}>
                                Clear All
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Queue Content */}
            {hasJobs && isExpanded && (
                <div className={styles.queueContent}>
                    <div className={styles.jobList}>
                        {queueState.jobs.map(job => (
                            <div key={job.id} className={styles.jobItem}>
                                <div className={styles.jobHeader}>
                                    <div className={styles.jobInfo}>
                                        <span
                                            className={styles.jobStatus}
                                            style={{ color: getStatusColor(job.status) }}
                                        >
                                            {getStatusIcon(job.status)}
                                        </span>
                                        <div className={styles.jobFiles}>
                                            <div className={styles.jobInputFile}>
                                                {getFileName(job.inputFile)}
                                            </div>
                                            <div className={styles.jobOutputFile}>
                                                → {getFileName(job.outputFile)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.jobActions}>
                                        {job.status === 'failed' && (
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                onClick={() => handleRetryJob(job.id)}
                                            >
                                                Retry
                                            </Button>
                                        )}
                                        {job.status === 'running' && (
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                onClick={() => handleCancelJob(job.id)}
                                            >
                                                Cancel
                                            </Button>
                                        )}
                                        {(job.status === 'completed' || job.status === 'failed' || job.status === 'canceled') && (
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                onClick={() => handleRemoveJob(job.id)}
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                {job.status === 'running' && (
                                    <div className={styles.jobProgress}>
                                        <Progress value={job.progress} className={styles.progressBar} />
                                        <div className={styles.progressDetails}>
                                            <span>{Math.round(job.progress)}%</span>
                                            {job.speed && <span>{job.speed}</span>}
                                            {job.etaSeconds && <span>{formatETA(job.etaSeconds)}</span>}
                                        </div>
                                    </div>
                                )}

                                {/* Error Message */}
                                {job.status === 'failed' && job.error && (
                                    <div className={styles.jobError}>
                                        <span className={styles.errorLabel}>Error:</span>
                                        <span className={styles.errorMessage}>{job.error}</span>
                                    </div>
                                )}

                                {/* Completion Time */}
                                {job.status === 'completed' && job.startTime && job.endTime && (
                                    <div className={styles.jobDuration}>
                                        Completed in {formatDuration((job.endTime - job.startTime) / 1000)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!hasJobs && (
                <div className={styles.emptyState}>
                    <p>No jobs in queue</p>
                    <p className={styles.emptyStateSubtext}>
                        Jobs will appear here when you start conversions
                    </p>
                </div>
            )}
        </div>
    );
};

export default ProcessingQueue;