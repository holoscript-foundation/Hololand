import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Panel } from '../src/components/Panel';
import { ThemeProvider } from '../src/hooks/useTheme';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider defaultTheme="dark">{ui}</ThemeProvider>);
}

describe('Panel', () => {
  it('renders children', () => {
    renderWithTheme(
      <Panel>
        <p>Panel content</p>
      </Panel>,
    );
    expect(screen.getByText('Panel content')).toBeInTheDocument();
  });

  it('renders a title header', () => {
    renderWithTheme(<Panel title="Output">Content</Panel>);
    expect(screen.getByText('Output')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders custom header content', () => {
    renderWithTheme(
      <Panel header={<span data-testid="custom-header">Custom</span>}>Body</Panel>,
    );
    expect(screen.getByTestId('custom-header')).toBeInTheDocument();
  });

  it('supports collapsible behavior', () => {
    const handleCollapse = vi.fn();
    renderWithTheme(
      <Panel title="Collapsible" collapsible collapsed={false} onCollapseChange={handleCollapse}>
        Content here
      </Panel>,
    );

    // Click the header to toggle
    fireEvent.click(screen.getByText('Collapsible'));
    expect(handleCollapse).toHaveBeenCalledWith(true);
  });

  it('hides content when collapsed', () => {
    renderWithTheme(
      <Panel title="Collapsed" collapsible collapsed>
        <p data-testid="hidden-content">Should be hidden</p>
      </Panel>,
    );

    const content = screen.getByTestId('hidden-content').parentElement;
    expect(content?.style.display).toBe('none');
  });

  it('supports keyboard interaction for collapsible panels', () => {
    const handleCollapse = vi.fn();
    renderWithTheme(
      <Panel title="Keyboard" collapsible collapsed={false} onCollapseChange={handleCollapse}>
        Content
      </Panel>,
    );

    const header = screen.getByText('Keyboard').closest('[role="button"]');
    expect(header).toBeDefined();

    if (header) {
      fireEvent.keyDown(header, { key: 'Enter' });
      expect(handleCollapse).toHaveBeenCalledWith(true);
    }
  });
});
