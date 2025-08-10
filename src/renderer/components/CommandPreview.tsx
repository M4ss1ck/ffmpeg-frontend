import React, { useState, useRef, useEffect } from 'react';
import Button from './ui/Button';
import { GeneratedCommand } from '../types/services';
import styles from './CommandPreview.module.css';

interface CommandPreviewProps {
    command: GeneratedCommand;
    onCommandEdit?: (editedCommand: string) => void;
    onCopyCommand?: () => void;
    isEditable?: boolean;
}

const CommandPreview: React.FC<CommandPreviewProps> = ({
    command,
    onCommandEdit,
    onCopyCommand,
    isEditable = true,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedCommand, setEditedCommand] = useState(command.command);
    const [copied, setCopied] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setEditedCommand(command.command);
    }, [command.command]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(command.command);
            setCopied(true);
            onCopyCommand?.();
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy command:', error);
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
        setTimeout(() => {
            textareaRef.current?.focus();
            textareaRef.current?.select();
        }, 0);
    };

    const handleSave = () => {
        onCommandEdit?.(editedCommand);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedCommand(command.command);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    const syntaxHighlight = (commandString: string): React.ReactNode => {
        const parts = commandString.split(/(\s+)/);
        const highlighted: React.ReactNode[] = [];
        let isFlag = false;
        let isValue = false;

        parts.forEach((part, index) => {
            if (!part.trim()) {
                highlighted.push(<span key={index}>{part}</span>);
                return;
            }

            // Reset flags for new arguments
            if (part.startsWith('-')) {
                isFlag = true;
                isValue = false;
                highlighted.push(
                    <span key={index} className={styles.flag}>
                        {part}
                    </span>
                );
            } else if (isFlag && !isValue) {
                isValue = true;
                isFlag = false;

                // Determine value type for different styling
                if (part.includes('.') && !isNaN(parseFloat(part))) {
                    // Numeric value
                    highlighted.push(
                        <span key={index} className={styles.number}>
                            {part}
                        </span>
                    );
                } else if (part.startsWith('"') && part.endsWith('"')) {
                    // File path
                    highlighted.push(
                        <span key={index} className={styles.path}>
                            {part}
                        </span>
                    );
                } else if (part.includes('=')) {
                    // Filter or parameter
                    const [filterName, ...paramParts] = part.split('=');
                    const params = paramParts.join('=');
                    highlighted.push(
                        <span key={index}>
                            <span className={styles.filter}>{filterName}</span>
                            <span className={styles.operator}>=</span>
                            <span className={styles.parameter}>{params}</span>
                        </span>
                    );
                } else {
                    // Regular value
                    highlighted.push(
                        <span key={index} className={styles.value}>
                            {part}
                        </span>
                    );
                }
            } else {
                // Reset state for next argument
                isFlag = false;
                isValue = false;

                if (part === 'ffmpeg') {
                    highlighted.push(
                        <span key={index} className={styles.command}>
                            {part}
                        </span>
                    );
                } else if (part.startsWith('"') && part.endsWith('"')) {
                    highlighted.push(
                        <span key={index} className={styles.path}>
                            {part}
                        </span>
                    );
                } else {
                    highlighted.push(
                        <span key={index} className={styles.text}>
                            {part}
                        </span>
                    );
                }
            }
        });

        return highlighted;
    };

    const getComplexityColor = (complexity: string) => {
        switch (complexity) {
            case 'low':
                return 'var(--color-success)';
            case 'medium':
                return 'var(--color-warning)';
            case 'high':
                return 'var(--color-error)';
            default:
                return 'var(--color-text-secondary)';
        }
    };

    return (
        <div className={styles.commandPreview}>
            <div className={styles.header}>
                <div className={styles.info}>
                    <h4>FFmpeg Command</h4>
                    <div className={styles.metadata}>
                        <span className={styles.description}>{command.description}</span>
                        <span
                            className={styles.complexity}
                            style={{ color: getComplexityColor(command.estimatedComplexity) }}
                        >
                            {command.estimatedComplexity} complexity
                        </span>
                    </div>
                </div>
                <div className={styles.actions}>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        disabled={copied}
                    >
                        {copied ? 'Copied!' : 'Copy'}
                    </Button>
                    {isEditable && (
                        <>
                            {isEditing ? (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleSave}
                                    >
                                        Save
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCancel}
                                    >
                                        Cancel
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleEdit}
                                >
                                    Edit
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className={styles.commandContainer}>
                {isEditing ? (
                    <div className={styles.editMode}>
                        <textarea
                            ref={textareaRef}
                            value={editedCommand}
                            onChange={(e) => setEditedCommand(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className={styles.commandEditor}
                            rows={Math.max(3, editedCommand.split('\n').length)}
                            spellCheck={false}
                        />
                        <div className={styles.editHint}>
                            Press Ctrl+Enter to save, Escape to cancel
                        </div>
                    </div>
                ) : (
                    <div className={styles.commandDisplay}>
                        <pre className={styles.commandText}>
                            <code>{syntaxHighlight(command.command)}</code>
                        </pre>
                    </div>
                )}
            </div>

            {command.args.length > 0 && (
                <div className={styles.argumentsList}>
                    <h5>Arguments Breakdown:</h5>
                    <div className={styles.arguments}>
                        {command.args.map((arg, index) => (
                            <span
                                key={index}
                                className={`${styles.argument} ${arg.startsWith('-') ? styles.argumentFlag : styles.argumentValue
                                    }`}
                            >
                                {arg}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommandPreview;