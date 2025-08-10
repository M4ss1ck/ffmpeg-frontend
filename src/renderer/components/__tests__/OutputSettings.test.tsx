import React from 'react';
import { render, screen } from '@testing-library/react';
import OutputSettings from '../OutputSettings';
import { MediaFileInfo } from '../../../types/services';

// Mock the electronAPI
const mockElectronAPI = {
    ffmpeg: {
        getFormats: jest.fn().mockResolvedValue({
            success: true,
            data: [
                { name: 'mp4', longName: 'MP4 (MPEG-4 Part 14)', canMux: true, canDemux: true },
                { name: 'mkv', longName: 'Matroska', canMux: true, canDemux: true },
            ]
        }),
        getCodecs: jest.fn().mockResolvedValue({
            success: true,
            data: [
                { name: 'libx264', longName: 'H.264', type: 'video', canEncode: true, canDecode: true },
                { name: 'aac', longName: 'AAC', type: 'audio', canEncode: true, canDecode: true },
            ]
        }),
    },
    dialog: {
        selectOutputPath: jest.fn().mockResolvedValue({
            success: true,
            data: '/path/to/output'
        }),
    },
};

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true,
});

const mockMediaFile: MediaFileInfo = {
    path: '/test/video.mp4',
    name: 'video.mp4',
    size: 1000000,
    duration: 60,
    format: 'mp4',
    streams: [
        {
            index: 0,
            type: 'video',
            codec: 'h264',
            width: 1920,
            height: 1080,
            frameRate: 30,
        },
        {
            index: 1,
            type: 'audio',
            codec: 'aac',
            sampleRate: 44100,
            channels: 2,
        },
    ],
    metadata: {},
};

describe('OutputSettings', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the output settings interface', async () => {
        const mockOnSettingsChange = jest.fn();

        render(
            <OutputSettings
                selectedFiles={[mockMediaFile]}
                onSettingsChange={mockOnSettingsChange}
            />
        );

        // Wait for the component to load
        expect(screen.getByText('Loading output settings...')).toBeInTheDocument();
    });

    it('shows format and codec selection when loaded', async () => {
        const mockOnSettingsChange = jest.fn();

        render(
            <OutputSettings
                selectedFiles={[mockMediaFile]}
                onSettingsChange={mockOnSettingsChange}
            />
        );

        // Wait for loading to complete and check for main elements
        await screen.findByText('Output Settings');
        expect(screen.getByText('Configure format, quality, and encoding options')).toBeInTheDocument();
    });
});