import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FilterPanel } from '../FilterPanel';
import { FilterConfig, FilterDefinition, FilterCategory } from '../../types/services';

// Mock filter data
const mockFilterDefinitions: FilterDefinition[] = [
    {
        name: 'blur',
        description: 'Apply Gaussian blur filter',
        inputs: 1,
        outputs: 1,
        timeline: true,
        slice: false,
        command: false,
        category: 'Video Effects',
        parameters: [
            {
                name: 'sigma',
                type: 'range',
                description: 'Blur strength',
                required: false,
                defaultValue: 1.0,
                min: 0.1,
                max: 10.0,
                step: 0.1,
            },
        ],
        examples: ['blur=sigma=2.0'],
    },
    {
        name: 'scale',
        description: 'Scale the input video size',
        inputs: 1,
        outputs: 1,
        timeline: false,
        slice: false,
        command: false,
        category: 'Video Filters',
        parameters: [
            {
                name: 'width',
                type: 'number',
                description: 'Output width (-1 for auto)',
                required: true,
                defaultValue: -1,
                min: -1,
                max: 7680,
            },
            {
                name: 'height',
                type: 'number',
                description: 'Output height (-1 for auto)',
                required: true,
                defaultValue: -1,
                min: -1,
                max: 4320,
            },
        ],
        examples: ['scale=1920:1080'],
    },
];

const mockFilterCategories: FilterCategory[] = [
    {
        name: 'Video Effects',
        description: 'Visual effects and enhancements',
        filters: ['blur'],
    },
    {
        name: 'Video Filters',
        description: 'Video processing and manipulation',
        filters: ['scale'],
    },
];

const mockFilters: FilterConfig[] = [];

const mockOnFiltersChange = jest.fn();

describe('FilterPanel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders filter panel with available filters', () => {
        render(
            <FilterPanel
                filters={mockFilters}
                onFiltersChange={mockOnFiltersChange}
                availableFilters={mockFilterDefinitions}
                filterCategories={mockFilterCategories}
            />
        );

        expect(screen.getByText('Filters')).toBeInTheDocument();
        expect(screen.getByText('Available Filters')).toBeInTheDocument();
        expect(screen.getByText('Applied Filters (0)')).toBeInTheDocument();
        expect(screen.getByText('blur')).toBeInTheDocument();
        expect(screen.getByText('scale')).toBeInTheDocument();
    });

    it('allows searching for filters', async () => {
        render(
            <FilterPanel
                filters={mockFilters}
                onFiltersChange={mockOnFiltersChange}
                availableFilters={mockFilterDefinitions}
                filterCategories={mockFilterCategories}
            />
        );

        const searchInput = screen.getByPlaceholderText('Search filters...');
        fireEvent.change(searchInput, { target: { value: 'blur' } });

        await waitFor(() => {
            expect(screen.getByText('blur')).toBeInTheDocument();
            expect(screen.queryByText('scale')).not.toBeInTheDocument();
        });
    });

    it('allows filtering by category', async () => {
        render(
            <FilterPanel
                filters={mockFilters}
                onFiltersChange={mockOnFiltersChange}
                availableFilters={mockFilterDefinitions}
                filterCategories={mockFilterCategories}
            />
        );

        const categorySelect = screen.getByDisplayValue('All Categories');
        fireEvent.change(categorySelect, { target: { value: 'Video Effects' } });

        await waitFor(() => {
            expect(screen.getByText('blur')).toBeInTheDocument();
            expect(screen.queryByText('scale')).not.toBeInTheDocument();
        });
    });

    it('adds filter when clicked', () => {
        render(
            <FilterPanel
                filters={mockFilters}
                onFiltersChange={mockOnFiltersChange}
                availableFilters={mockFilterDefinitions}
                filterCategories={mockFilterCategories}
            />
        );

        const blurFilter = screen.getByText('blur');
        fireEvent.click(blurFilter);

        expect(mockOnFiltersChange).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'blur',
                    enabled: true,
                    order: 0,
                }),
            ])
        );
    });

    it('displays applied filters with parameters', () => {
        const appliedFilters: FilterConfig[] = [
            {
                id: 'filter_1',
                name: 'blur',
                parameters: {
                    sigma: { value: 2.0, type: 'range' },
                },
                enabled: true,
                order: 0,
            },
        ];

        render(
            <FilterPanel
                filters={appliedFilters}
                onFiltersChange={mockOnFiltersChange}
                availableFilters={mockFilterDefinitions}
                filterCategories={mockFilterCategories}
            />
        );

        expect(screen.getByText('Applied Filters (1)')).toBeInTheDocument();
        expect(screen.getByText('blur')).toBeInTheDocument();
        expect(screen.getByText('sigma')).toBeInTheDocument();
    });

    it('allows removing applied filters', () => {
        const appliedFilters: FilterConfig[] = [
            {
                id: 'filter_1',
                name: 'blur',
                parameters: {},
                enabled: true,
                order: 0,
            },
        ];

        render(
            <FilterPanel
                filters={appliedFilters}
                onFiltersChange={mockOnFiltersChange}
                availableFilters={mockFilterDefinitions}
                filterCategories={mockFilterCategories}
            />
        );

        const removeButton = screen.getByText('Remove');
        fireEvent.click(removeButton);

        expect(mockOnFiltersChange).toHaveBeenCalledWith([]);
    });

    it('allows toggling filter enabled state', () => {
        const appliedFilters: FilterConfig[] = [
            {
                id: 'filter_1',
                name: 'blur',
                parameters: {},
                enabled: true,
                order: 0,
            },
        ];

        render(
            <FilterPanel
                filters={appliedFilters}
                onFiltersChange={mockOnFiltersChange}
                availableFilters={mockFilterDefinitions}
                filterCategories={mockFilterCategories}
            />
        );

        const disableButton = screen.getByText('Disable');
        fireEvent.click(disableButton);

        expect(mockOnFiltersChange).toHaveBeenCalledWith([
            expect.objectContaining({
                id: 'filter_1',
                enabled: false,
            }),
        ]);
    });

    it('updates filter parameters', () => {
        const appliedFilters: FilterConfig[] = [
            {
                id: 'filter_1',
                name: 'blur',
                parameters: {
                    sigma: { value: 1.0, type: 'range' },
                },
                enabled: true,
                order: 0,
            },
        ];

        render(
            <FilterPanel
                filters={appliedFilters}
                onFiltersChange={mockOnFiltersChange}
                availableFilters={mockFilterDefinitions}
                filterCategories={mockFilterCategories}
            />
        );

        const sigmaInput = screen.getByDisplayValue('1');
        fireEvent.change(sigmaInput, { target: { value: '3.5' } });

        expect(mockOnFiltersChange).toHaveBeenCalledWith([
            expect.objectContaining({
                id: 'filter_1',
                parameters: {
                    sigma: { value: 3.5, type: 'range' },
                },
            }),
        ]);
    });

    it('shows empty state when no filters are applied', () => {
        render(
            <FilterPanel
                filters={[]}
                onFiltersChange={mockOnFiltersChange}
                availableFilters={mockFilterDefinitions}
                filterCategories={mockFilterCategories}
            />
        );

        expect(screen.getByText('No filters applied. Click on a filter above to add it.')).toBeInTheDocument();
    });
});