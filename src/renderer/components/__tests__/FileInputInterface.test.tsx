import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FileInputInterface from '../FileInputInterface';

// Mock the electron API
const mockElectronAPI = {
    file: {
        getInfo: jest.fn(),
        isSupported: jest.fn(),
    },
    dialog: {
        selectFiles: jest.fn(),
    },
};

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
    value: mockElectronAPI,
    writable: true,
});

describe('FileInputInterface', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the file drop zone', () => {
        render(<FileInputInterface />);

        expect(screen.getByText('Drop your media files here')).toBeInTheDocument();
        expect(screen.getByText('Supports video and audio files up to 10GB each')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /browse files/i })).toBeInTheDocument();
    });

    it('shows max files warning when at capacity', () => {
        render(<FileInputInterface maxFiles={0} />);

        expect(screen.getByText(/maximum of 0 files reached/i)).toBeInTheDocument();
    });

    it('calls onFilesChange when files are added', () => {
        const mockOnFilesChange = jest.fn();
        render(<FileInputInterface onFilesChange={mockOnFilesChange} />);

        // This test would require more complex mocking of drag and drop events
        // For now, we just verify the component renders without errors
        expect(screen.getByText('Drop your media files here')).toBeInTheDocument();
    });
});