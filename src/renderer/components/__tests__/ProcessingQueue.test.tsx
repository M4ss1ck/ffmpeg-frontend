import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProcessingQueue from '../ProcessingQueue';

// Mock the electronAPI
const mockElectronAPI = {
    queue: {
        getState: vi.fn(),
        addJob: vi.fn(),
        removeJob: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        clear: vi.fn(),
        retryJob: vi.fn(),
        cancelJob: vi.fn(),
        getJob: vi.fn(),
        getStats: vi.fn(),
        onProgress: vi.fn(),
        onJobComplete: vi.fn(),
        onStateChange: vi.fn(),
    },
};

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true,
});

describe('ProcessingQueue', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock implementation
        mockElectronAPI.queue.getState.mockResolvedValue({
            success: true,
            data: {
                jobs: [],
                isRunning: false,
            },
        });
    });

    it('renders empty state when no jobs are present', async () => {
        render(<ProcessingQueue />);

        expect(screen.getByText('Processing Queue')).toBeInTheDocument();
        expect(screen.getByText('No jobs in queue')).toBeInTheDocument();
        expect(screen.getByText('Jobs will appear here when you start conversions')).toBeInTheDocument();
    });

    it('displays queue stats when jobs are present', async () => {
        mockElectronAPI.queue.getState.mockResolvedValue({
            success: true,
            data: {
                jobs: [
                    {
                        id: 'job1',
                        inputFile: '/path/to/input.mp4',
                        outputFile: '/path/to/output.mp4',
                        args: ['-i', '/path/to/input.mp4', '/path/to/output.mp4'],
                        status: 'queued',
                        progress: 0,
                    },
                    {
                        id: 'job2',
                        inputFile: '/path/to/input2.mp4',
                        outputFile: '/path/to/output2.mp4',
                        args: ['-i', '/path/to/input2.mp4', '/path/to/output2.mp4'],
                        status: 'completed',
                        progress: 100,
                    },
                ],
                isRunning: false,
            },
        });

        render(<ProcessingQueue />);

        // Wait for component to load state
        await screen.findByText('2 total');

        expect(screen.getByText('Processing Queue')).toBeInTheDocument();
        expect(screen.getByText('2 total')).toBeInTheDocument();
        expect(screen.getByText('1 queued')).toBeInTheDocument();
        expect(screen.getByText('1 completed')).toBeInTheDocument();
    });

    it('shows start queue button when there are queued jobs', async () => {
        mockElectronAPI.queue.getState.mockResolvedValue({
            success: true,
            data: {
                jobs: [
                    {
                        id: 'job1',
                        inputFile: '/path/to/input.mp4',
                        outputFile: '/path/to/output.mp4',
                        args: ['-i', '/path/to/input.mp4', '/path/to/output.mp4'],
                        status: 'queued',
                        progress: 0,
                    },
                ],
                isRunning: false,
            },
        });

        render(<ProcessingQueue />);

        await screen.findByText('Start Queue');
        expect(screen.getByText('Start Queue')).toBeInTheDocument();
    });

    it('shows stop queue button when queue is running', async () => {
        mockElectronAPI.queue.getState.mockResolvedValue({
            success: true,
            data: {
                jobs: [
                    {
                        id: 'job1',
                        inputFile: '/path/to/input.mp4',
                        outputFile: '/path/to/output.mp4',
                        args: ['-i', '/path/to/input.mp4', '/path/to/output.mp4'],
                        status: 'running',
                        progress: 50,
                    },
                ],
                isRunning: true,
            },
        });

        render(<ProcessingQueue />);

        await screen.findByText('Stop Queue');
        expect(screen.getByText('Stop Queue')).toBeInTheDocument();
    });

    it('registers event listeners on mount', () => {
        render(<ProcessingQueue />);

        expect(mockElectronAPI.queue.onStateChange).toHaveBeenCalled();
        expect(mockElectronAPI.queue.onJobComplete).toHaveBeenCalled();
    });

    it('loads initial queue state on mount', () => {
        render(<ProcessingQueue />);

        expect(mockElectronAPI.queue.getState).toHaveBeenCalled();
    });
});