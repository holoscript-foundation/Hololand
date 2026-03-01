import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs, type TabItem } from '../src/components/Tabs';
import { ThemeProvider } from '../src/hooks/useTheme';

const mockItems: TabItem[] = [
  { id: 'main', label: 'main.holo' },
  { id: 'output', label: 'Output' },
  { id: 'errors', label: 'Errors' },
];

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider defaultTheme="dark">{ui}</ThemeProvider>);
}

describe('Tabs', () => {
  it('renders all tab items', () => {
    renderWithTheme(<Tabs items={mockItems} />);
    expect(screen.getByText('main.holo')).toBeInTheDocument();
    expect(screen.getByText('Output')).toBeInTheDocument();
    expect(screen.getByText('Errors')).toBeInTheDocument();
  });

  it('marks the active tab with aria-selected', () => {
    renderWithTheme(<Tabs items={mockItems} activeId="output" />);
    const outputTab = screen.getByText('Output');
    expect(outputTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('main.holo')).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange when a tab is clicked', () => {
    const handleChange = vi.fn();
    renderWithTheme(<Tabs items={mockItems} activeId="main" onChange={handleChange} />);
    fireEvent.click(screen.getByText('Output'));
    expect(handleChange).toHaveBeenCalledWith('output');
  });

  it('handles keyboard navigation with ArrowRight', () => {
    const handleChange = vi.fn();
    renderWithTheme(<Tabs items={mockItems} activeId="main" onChange={handleChange} />);
    const firstTab = screen.getByText('main.holo');
    fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
    expect(handleChange).toHaveBeenCalledWith('output');
  });

  it('handles keyboard navigation with ArrowLeft (wraps around)', () => {
    const handleChange = vi.fn();
    renderWithTheme(<Tabs items={mockItems} activeId="main" onChange={handleChange} />);
    const firstTab = screen.getByText('main.holo');
    fireEvent.keyDown(firstTab, { key: 'ArrowLeft' });
    expect(handleChange).toHaveBeenCalledWith('errors');
  });

  it('renders closable tabs with close button', () => {
    const items: TabItem[] = [
      { id: 'file1', label: 'file1.holo', closable: true },
      { id: 'file2', label: 'file2.holo', closable: false },
    ];
    const handleClose = vi.fn();
    renderWithTheme(<Tabs items={items} activeId="file1" onClose={handleClose} />);

    const closeBtn = screen.getByLabelText('Close file1.holo');
    expect(closeBtn).toBeInTheDocument();

    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledWith('file1');
  });

  it('renders with tablist role', () => {
    renderWithTheme(<Tabs items={mockItems} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('renders tabs with tab role', () => {
    renderWithTheme(<Tabs items={mockItems} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
  });
});
