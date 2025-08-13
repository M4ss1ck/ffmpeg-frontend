import React, { useState, createContext, useContext } from 'react';
import './Tabs.css';

interface TabsContextType {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

interface TabsProps {
    defaultValue: string;
    children: React.ReactNode;
    className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ defaultValue, children, className = '' }) => {
    const [activeTab, setActiveTab] = useState(defaultValue);

    return (
        <TabsContext.Provider value={{ activeTab, setActiveTab }}>
            <div className={`tabs ${className}`}>
                {children}
            </div>
        </TabsContext.Provider>
    );
};

interface TabsListProps {
    children: React.ReactNode;
    className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({ children, className = '' }) => {
    return (
        <div className={`tabs-list ${className}`}>
            {children}
        </div>
    );
};

interface TabsTriggerProps {
    value: string;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
    value,
    children,
    className = '',
    disabled = false
}) => {
    const context = useContext(TabsContext);
    if (!context) {
        throw new Error('TabsTrigger must be used within Tabs');
    }

    const { activeTab, setActiveTab } = context;
    const isActive = activeTab === value;

    return (
        <button
            className={`tabs-trigger ${isActive ? 'active' : ''} ${disabled ? 'disabled' : ''} ${className}`}
            onClick={() => !disabled && setActiveTab(value)}
            disabled={disabled}
            type="button"
        >
            {children}
        </button>
    );
};

interface TabsContentProps {
    value: string;
    children: React.ReactNode;
    className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ value, children, className = '' }) => {
    const context = useContext(TabsContext);
    if (!context) {
        throw new Error('TabsContent must be used within Tabs');
    }

    const { activeTab } = context;

    if (activeTab !== value) {
        return null;
    }

    return (
        <div className={`tabs-content ${className}`}>
            {children}
        </div>
    );
};