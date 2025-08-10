import React, { useState, useMemo } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import {
    FilterConfig,
    FilterDefinition,
    FilterCategory,
    FilterParameterValue,
    FilterParameter,
} from '../types/services';
import styles from './FilterPanel.module.css';

interface FilterPanelProps {
    filters: FilterConfig[];
    onFiltersChange: (filters: FilterConfig[]) => void;
    availableFilters: FilterDefinition[];
    filterCategories: FilterCategory[];
}

const FilterPanel: React.FC<FilterPanelProps> = ({
    filters,
    onFiltersChange,
    availableFilters,
    filterCategories,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Filter available filters based on search and category
    const filteredAvailableFilters = useMemo(() => {
        return availableFilters.filter(filter => {
            const matchesSearch = filter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                filter.description.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCategory = selectedCategory === 'all' || filter.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [availableFilters, searchTerm, selectedCategory]);

    const addFilter = (filterDef: FilterDefinition) => {
        const newFilter: FilterConfig = {
            id: `filter_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            name: filterDef.name,
            parameters: {},
            enabled: true,
            order: filters.length,
        };

        // Initialize parameters with default values
        filterDef.parameters.forEach(param => {
            if (param.defaultValue !== undefined) {
                newFilter.parameters[param.name] = {
                    value: param.defaultValue,
                    type: param.type,
                };
            }
        });

        onFiltersChange([...filters, newFilter]);
    };

    const removeFilter = (filterId: string) => {
        const updatedFilters = filters.filter(f => f.id !== filterId);
        // Reorder remaining filters
        const reorderedFilters = updatedFilters.map((filter, index) => ({
            ...filter,
            order: index,
        }));
        onFiltersChange(reorderedFilters);
    };

    const toggleFilter = (filterId: string) => {
        const updatedFilters = filters.map(filter =>
            filter.id === filterId ? { ...filter, enabled: !filter.enabled } : filter
        );
        onFiltersChange(updatedFilters);
    };

    const updateFilterParameter = (
        filterId: string,
        paramName: string,
        value: string | number | boolean
    ) => {
        const updatedFilters = filters.map(filter => {
            if (filter.id === filterId) {
                const filterDef = availableFilters.find(f => f.name === filter.name);
                const paramDef = filterDef?.parameters.find(p => p.name === paramName);

                return {
                    ...filter,
                    parameters: {
                        ...filter.parameters,
                        [paramName]: {
                            value,
                            type: paramDef?.type || 'string',
                        } as FilterParameterValue,
                    },
                };
            }
            return filter;
        });
        onFiltersChange(updatedFilters);
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();

        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            return;
        }

        const reorderedFilters = [...filters];
        const draggedFilter = reorderedFilters[draggedIndex];

        // Remove dragged filter
        reorderedFilters.splice(draggedIndex, 1);

        // Insert at new position
        const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
        reorderedFilters.splice(insertIndex, 0, draggedFilter);

        // Update order values
        const updatedFilters = reorderedFilters.map((filter, index) => ({
            ...filter,
            order: index,
        }));

        onFiltersChange(updatedFilters);
        setDraggedIndex(null);
    };

    const renderFilterParameter = (
        filter: FilterConfig,
        paramName: string,
        paramDef: FilterParameter
    ) => {
        const currentValue =
            filter.parameters[paramName]?.value ?? (paramDef.defaultValue as any) ?? '';

        switch (paramDef.type) {
            case 'number':
            case 'range':
                return (
                    <Input
                        type="number"
                        value={
                            typeof currentValue === 'number' || typeof currentValue === 'string'
                                ? (currentValue as number | string)
                                : ''
                        }
                        onChange={(e) =>
                            updateFilterParameter(
                                filter.id,
                                paramName,
                                parseFloat(e.target.value) || 0
                            )
                        }
                        min={paramDef.min}
                        max={paramDef.max}
                        step={paramDef.step || 1}
                        placeholder={(paramDef.defaultValue as any)?.toString?.() || ''}
                    />
                );

            case 'boolean':
                return (
                    <input
                        type="checkbox"
                        checked={Boolean(currentValue)}
                        onChange={(e) => updateFilterParameter(filter.id, paramName, e.target.checked)}
                        className={styles.checkbox}
                    />
                );

            case 'select':
                return (
                    <Select
                        value={currentValue.toString()}
                        onChange={(e) => updateFilterParameter(filter.id, paramName, e.target.value)}
                        options={
                            (paramDef.options || []).map((opt: string) => ({ value: opt, label: opt }))
                        }
                    />
                );

            default:
                return (
                    <Input
                        type="text"
                        value={currentValue.toString()}
                        onChange={(e) => updateFilterParameter(filter.id, paramName, e.target.value)}
                        placeholder={(paramDef.defaultValue as any)?.toString?.() || ''}
                    />
                );
        }
    };

    // Sort filters by order
    const sortedFilters = [...filters].sort((a, b) => a.order - b.order);

    return (
        <div className={styles.filterPanel}>
            <div className={styles.header}>
                <h3>Filters</h3>
                <div className={styles.controls}>
                    <Input
                        type="text"
                        placeholder="Search filters..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                    <Select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        options={[
                            { value: 'all', label: 'All Categories' },
                            ...filterCategories.map(cat => ({ value: cat.name, label: cat.name })),
                        ]}
                        className={styles.categorySelect}
                    />
                </div>
            </div>

            <div className={styles.content}>
                <div className={styles.availableFilters}>
                    <h4>Available Filters</h4>
                    <div className={styles.filterGrid}>
                        {filteredAvailableFilters.map(filterDef => (
                            <div
                                key={filterDef.name}
                                className={styles.availableFilter}
                                onClick={() => addFilter(filterDef)}
                            >
                                <div className={styles.filterName}>{filterDef.name}</div>
                                <div className={styles.filterDescription}>{filterDef.description}</div>
                                <div className={styles.filterCategory}>{filterDef.category}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.appliedFilters}>
                    <h4>Applied Filters ({filters.length})</h4>
                    {sortedFilters.length === 0 ? (
                        <div className={styles.emptyState}>
                            No filters applied. Click on a filter above to add it.
                        </div>
                    ) : (
                        <div className={styles.filterList}>
                            {sortedFilters.map((filter, index) => {
                                const filterDef = availableFilters.find(f => f.name === filter.name);

                                return (
                                    <div
                                        key={filter.id}
                                        className={`${styles.appliedFilter} ${!filter.enabled ? styles.disabled : ''}`}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, index)}
                                    >
                                        <div className={styles.filterHeader}>
                                            <div className={styles.filterInfo}>
                                                <span className={styles.filterOrder}>{index + 1}</span>
                                                <span className={styles.filterName}>{filter.name}</span>
                                                <span className={styles.filterDescription}>
                                                    {filterDef?.description}
                                                </span>
                                            </div>
                                            <div className={styles.filterActions}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleFilter(filter.id)}
                                                >
                                                    {filter.enabled ? 'Disable' : 'Enable'}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeFilter(filter.id)}
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        </div>

                                        {filter.enabled && filterDef && filterDef.parameters.length > 0 && (
                                            <div className={styles.filterParameters}>
                                                {filterDef.parameters.map(param => (
                                                    <div key={param.name} className={styles.parameter}>
                                                        <label className={styles.parameterLabel}>
                                                            {param.name}
                                                            {param.required && <span className={styles.required}>*</span>}
                                                        </label>
                                                        <div className={styles.parameterInput}>
                                                            {renderFilterParameter(filter, param.name, param)}
                                                        </div>
                                                        {param.description && (
                                                            <div className={styles.parameterDescription}>
                                                                {param.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilterPanel;