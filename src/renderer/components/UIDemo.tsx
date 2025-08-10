import React, { useState } from 'react';
import { Button, Input, Select, Card, Progress } from './ui';
import type { SelectOption } from './ui';

const UIDemo: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [progress, setProgress] = useState(45);
  const [loading, setLoading] = useState(false);

  const selectOptions: SelectOption[] = [
    { value: 'mp4', label: 'MP4 Video' },
    { value: 'avi', label: 'AVI Video' },
    { value: 'mov', label: 'MOV Video' },
    { value: 'mkv', label: 'MKV Video' },
  ];

  const handleLoadingDemo = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  const handleProgressDemo = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '2rem', color: 'var(--color-primary)' }}>
        UI Components Demo
      </h2>

      {/* Buttons */}
      <Card padding="md" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Buttons</h3>
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '1rem',
          }}
        >
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '1rem',
          }}
        >
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Button loading={loading} onClick={handleLoadingDemo}>
            {loading ? 'Loading...' : 'Test Loading'}
          </Button>
          <Button disabled>Disabled</Button>
        </div>
      </Card>

      {/* Inputs */}
      <Card padding="md" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Inputs</h3>
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          }}
        >
          <Input
            label="Default Input"
            placeholder="Enter text..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            helperText="This is helper text"
          />
          <Input
            label="Filled Input"
            variant="filled"
            placeholder="Filled variant..."
          />
          <Input
            label="Input with Error"
            placeholder="Error state..."
            error="This field is required"
          />
          <Input label="Disabled Input" placeholder="Disabled..." disabled />
        </div>
      </Card>

      {/* Selects */}
      <Card padding="md" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Selects</h3>
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          }}
        >
          <Select
            label="Video Format"
            options={selectOptions}
            placeholder="Choose format..."
            value={selectValue}
            onChange={e => setSelectValue(e.target.value)}
            helperText="Select output format"
          />
          <Select
            label="Filled Select"
            variant="filled"
            options={selectOptions}
            placeholder="Filled variant..."
          />
          <Select
            label="Select with Error"
            options={selectOptions}
            placeholder="Error state..."
            error="Please select an option"
          />
          <Select
            label="Disabled Select"
            options={selectOptions}
            placeholder="Disabled..."
            disabled
          />
        </div>
      </Card>

      {/* Progress */}
      <Card padding="md" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Progress</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Progress
            value={progress}
            showLabel
            label={`Conversion Progress: ${progress}%`}
          />
          <Progress
            value={75}
            variant="success"
            size="sm"
            showLabel
            label="Success Progress"
          />
          <Progress
            value={60}
            variant="warning"
            size="lg"
            animated
            showLabel
            label="Warning Progress"
          />
          <Progress
            value={30}
            variant="error"
            showLabel
            label="Error Progress"
          />
          <Button onClick={handleProgressDemo} variant="outline">
            Animate Progress
          </Button>
        </div>
      </Card>

      {/* Cards */}
      <div
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        }}
      >
        <Card variant="default" padding="md">
          <h4>Default Card</h4>
          <p>This is a default card with shadow.</p>
        </Card>
        <Card variant="outlined" padding="md">
          <h4>Outlined Card</h4>
          <p>This is an outlined card without shadow.</p>
        </Card>
        <Card variant="elevated" padding="md" hover>
          <h4>Elevated Card</h4>
          <p>This is an elevated card with hover effect.</p>
        </Card>
      </div>
    </div>
  );
};

export default UIDemo;
