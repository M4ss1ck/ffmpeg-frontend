import React from 'react';
import FilterPanel from '../FilterPanel';
import { FilterConfig, FilterDefinition, FilterCategory } from '../../types/services';
import './TabContent.css';

interface FiltersTabProps {
    filters: FilterConfig[];
    onFiltersChange: (filters: FilterConfig[]) => void;
    availableFilters: FilterDefinition[];
    filterCategories: FilterCategory[];
    hasSelectedFiles: boolean;
}

const FiltersTab: React.FC<FiltersTabProps> = ({
    filters,
    onFiltersChange,
    availableFilters,
    filterCategories,
    hasSelectedFiles
}) => {
    if (!hasSelectedFiles) {
        return (
            <div className="tab-placeholder">
                <h2>Filters & Effects</h2>
                <p>Select files first to apply filters and effects</p>
            </div>
        );
    }

    return (
        <div className="filters-tab">
            <div className="tab-section">
                <h2>Filters & Effects</h2>
                <p>Apply video and audio filters to enhance your media</p>
                <FilterPanel
                    filters={filters}
                    onFiltersChange={onFiltersChange}
                    availableFilters={availableFilters}
                    filterCategories={filterCategories}
                />
            </div>
        </div>
    );
};

export default FiltersTab;