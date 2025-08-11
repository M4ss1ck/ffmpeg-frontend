import { EventEmitter } from 'events';
import { ffmpegService } from './ffmpegService.js';
import { ProcessingJob, QueueState, QueueStartOptions } from '../../types/services';

export interface QueueProgressEvent {
    jobId: string;
    progress: number;
    speed?: string;
    etaSeconds?: number;
}

export interface QueueJobCompleteEvent {
    jobId: string;
    success: boolean;
    error?: string;
}

export interface QueueStateChangeEvent {
    state: QueueState;
}

class QueueService extends EventEmitter {
    private jobs: Map<string, ProcessingJob> = new Map();
    private activeJobId: string | null = null;
    private isRunning: boolean = false;
    private currentProcess: any = null;
    private retryOnFail: boolean = false;
    private maxRetriesPerJob: number = 2;

    constructor() {
        super();
    }

    /**
     * Add a job to the queue
     */
    addJob(job: Omit<ProcessingJob, 'id' | 'status' | 'progress'>): string {
        const id = this.generateJobId();
        const newJob: ProcessingJob = {
            ...job,
            id,
            status: 'queued',
            progress: 0,
        };

        this.jobs.set(id, newJob);
        this.emitStateChange();

        console.log(`[QueueService] Added job ${id}: ${job.inputFile} -> ${job.outputFile}`);
        return id;
    }

    /**
     * Remove a job from the queue
     */
    removeJob(jobId: string): boolean {
        const job = this.jobs.get(jobId);
        if (!job) return false;

        // Cancel if currently running
        if (job.status === 'running' && this.activeJobId === jobId) {
            this.cancelCurrentJob();
        }

        this.jobs.delete(jobId);
        this.emitStateChange();

        console.log(`[QueueService] Removed job ${jobId}`);
        return true;
    }

    /**
     * Clear all jobs from the queue
     */
    clearQueue(): void {
        // Cancel current job if running
        if (this.isRunning) {
            this.stop();
        }

        this.jobs.clear();
        this.emitStateChange();

        console.log('[QueueService] Cleared queue');
    }

    /**
     * Get current queue state
     */
    getState(): QueueState {
        return {
            jobs: Array.from(this.jobs.values()).sort((a, b) => {
                // Running jobs first, then queued, then completed/failed
                const statusOrder = { running: 0, queued: 1, completed: 2, failed: 3, canceled: 4 };
                return statusOrder[a.status] - statusOrder[b.status];
            }),
            activeJobId: this.activeJobId || undefined,
            isRunning: this.isRunning,
        };
    }

    /**
     * Start processing the queue
     */
    async start(options: QueueStartOptions = {}): Promise<void> {
        if (this.isRunning) {
            console.log('[QueueService] Queue is already running');
            return;
        }

        this.retryOnFail = options.retryOnFail ?? false;
        this.maxRetriesPerJob = options.maxRetriesPerJob ?? 2;
        this.isRunning = true;

        console.log('[QueueService] Starting queue processing');
        this.emitStateChange();

        await this.processNextJob();
    }

    /**
     * Stop processing the queue
     */
    stop(): void {
        if (!this.isRunning) return;

        console.log('[QueueService] Stopping queue processing');
        this.isRunning = false;
        this.cancelCurrentJob();
        this.emitStateChange();
    }

    /**
     * Retry a failed job
     */
    async retryJob(jobId: string): Promise<boolean> {
        const job = this.jobs.get(jobId);
        if (!job || job.status !== 'failed') {
            return false;
        }

        // Reset job status
        job.status = 'queued';
        job.progress = 0;
        job.error = undefined;
        job.startTime = undefined;
        job.endTime = undefined;

        this.jobs.set(jobId, job);
        this.emitStateChange();

        console.log(`[QueueService] Retrying job ${jobId}`);

        // Start processing if not already running
        if (!this.isRunning) {
            await this.start();
        }

        return true;
    }

    /**
     * Cancel a specific job
     */
    cancelJob(jobId: string): boolean {
        const job = this.jobs.get(jobId);
        if (!job) return false;

        if (job.status === 'running' && this.activeJobId === jobId) {
            this.cancelCurrentJob();
        } else if (job.status === 'queued') {
            job.status = 'canceled';
            job.endTime = Date.now();
            this.jobs.set(jobId, job);
            this.emitStateChange();
        }

        console.log(`[QueueService] Canceled job ${jobId}`);
        return true;
    }

    /**
     * Get job by ID
     */
    getJob(jobId: string): ProcessingJob | undefined {
        return this.jobs.get(jobId);
    }

    /**
     * Update job progress
     */
    private updateJobProgress(jobId: string, progress: number, details?: { speed?: string; etaSeconds?: number }): void {
        const job = this.jobs.get(jobId);
        if (!job) return;

        job.progress = Math.max(0, Math.min(100, progress));
        if (details?.speed) job.speed = details.speed;
        if (details?.etaSeconds) job.etaSeconds = details.etaSeconds;

        this.jobs.set(jobId, job);

        // Emit progress event
        this.emit('progress', {
            jobId,
            progress: job.progress,
            speed: job.speed,
            etaSeconds: job.etaSeconds,
        } as QueueProgressEvent);

        this.emitStateChange();
    }

    /**
     * Process the next job in the queue
     */
    private async processNextJob(): Promise<void> {
        if (!this.isRunning) return;

        // Find next queued job
        const nextJob = Array.from(this.jobs.values()).find(job => job.status === 'queued');
        if (!nextJob) {
            console.log('[QueueService] No more jobs to process');
            this.isRunning = false;
            this.activeJobId = null;
            this.emitStateChange();
            return;
        }

        await this.executeJob(nextJob);
    }

    /**
     * Execute a specific job
     */
    private async executeJob(job: ProcessingJob): Promise<void> {
        console.log(`[QueueService] Starting job ${job.id}: ${job.inputFile} -> ${job.outputFile}`);

        // Update job status
        job.status = 'running';
        job.progress = 0;
        job.startTime = Date.now();
        job.error = undefined;
        this.activeJobId = job.id;
        this.jobs.set(job.id, job);
        this.emitStateChange();

        try {
            // Execute FFmpeg with progress tracking
            const result = await ffmpegService.executeArgs(
                job.args,
                (progress, details) => {
                    this.updateJobProgress(job.id, progress, {
                        speed: details?.speed,
                        etaSeconds: details?.time && job.durationSeconds
                            ? Math.max(0, (job.durationSeconds - details.time) / (details.time > 0 ? details.time / (Date.now() - (job.startTime || Date.now())) * 1000 : 1))
                            : undefined
                    });
                },
                job.durationSeconds
            );

            // Update job with result
            job.endTime = Date.now();
            if (result.success) {
                job.status = 'completed';
                job.progress = 100;
                console.log(`[QueueService] Job ${job.id} completed successfully`);
            } else {
                job.status = 'failed';
                job.error = result.error || 'Unknown error occurred';
                console.error(`[QueueService] Job ${job.id} failed:`, job.error);

                // Retry if enabled and retries remaining
                if (this.retryOnFail && this.shouldRetryJob(job)) {
                    console.log(`[QueueService] Retrying job ${job.id}`);
                    job.status = 'queued';
                    job.progress = 0;
                    job.startTime = undefined;
                    job.endTime = undefined;
                    job.error = undefined;
                }
            }

            this.jobs.set(job.id, job);

            // Emit completion event
            this.emit('jobComplete', {
                jobId: job.id,
                success: job.status === 'completed',
                error: job.error,
            } as QueueJobCompleteEvent);

        } catch (error) {
            console.error(`[QueueService] Job ${job.id} execution error:`, error);
            job.status = 'failed';
            job.error = error instanceof Error ? error.message : String(error);
            job.endTime = Date.now();
            this.jobs.set(job.id, job);

            this.emit('jobComplete', {
                jobId: job.id,
                success: false,
                error: job.error,
            } as QueueJobCompleteEvent);
        }

        this.activeJobId = null;
        this.emitStateChange();

        // Process next job
        if (this.isRunning) {
            setTimeout(() => this.processNextJob(), 100);
        }
    }

    /**
     * Cancel the currently running job
     */
    private cancelCurrentJob(): void {
        if (!this.activeJobId) return;

        const job = this.jobs.get(this.activeJobId);
        if (!job) return;

        // Kill the FFmpeg process if running
        if (this.currentProcess) {
            try {
                this.currentProcess.kill('SIGTERM');
            } catch (error) {
                console.error('[QueueService] Error killing process:', error);
            }
            this.currentProcess = null;
        }

        // Update job status
        job.status = 'canceled';
        job.endTime = Date.now();
        this.jobs.set(job.id, job);

        console.log(`[QueueService] Canceled job ${this.activeJobId}`);
        this.activeJobId = null;
    }

    /**
     * Check if a job should be retried
     */
    private shouldRetryJob(job: ProcessingJob): boolean {
        // Count previous retry attempts (simple heuristic)
        const retryCount = Array.from(this.jobs.values())
            .filter(j => j.inputFile === job.inputFile && j.outputFile === job.outputFile && j.status === 'failed')
            .length;

        return retryCount < this.maxRetriesPerJob;
    }

    /**
     * Generate a unique job ID
     */
    private generateJobId(): string {
        return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Emit state change event
     */
    private emitStateChange(): void {
        this.emit('stateChange', {
            state: this.getState(),
        } as QueueStateChangeEvent);
    }

    /**
     * Get queue statistics
     */
    getStats() {
        const jobs = Array.from(this.jobs.values());
        return {
            total: jobs.length,
            queued: jobs.filter(j => j.status === 'queued').length,
            running: jobs.filter(j => j.status === 'running').length,
            completed: jobs.filter(j => j.status === 'completed').length,
            failed: jobs.filter(j => j.status === 'failed').length,
            canceled: jobs.filter(j => j.status === 'canceled').length,
        };
    }
}

export const queueService = new QueueService();