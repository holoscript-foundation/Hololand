import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../src/components/Button';
import { ThemeProvider } from '../src/hooks/useTheme';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider defaultTheme="dark">{ui}</ThemeProvider>);
}

describe('Button', () => {
  it('renders with text content', () => {
    renderWithTheme(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    renderWithTheme(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders as disabled', () => {
    renderWithTheme(<Button disabled>Disabled</Button>);
    const button = screen.getByText('Disabled');
    expect(button).toBeDisabled();
  });

  it('does not fire click when disabled', () => {
    const handleClick = vi.fn();
    renderWithTheme(
      <Button disabled onClick={handleClick}>
        No Click
      </Button>,
    );
    fireEvent.click(screen.getByText('No Click'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders different variants', () => {
    const { container } = renderWithTheme(
      <>
        <Button variant="default">Default</Button>
        <Button variant="primary">Primary</Button>
        <Button variant="success">Success</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
      </>,
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(5);
  });

  it('renders different sizes', () => {
    renderWithTheme(
      <>
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </>,
    );
    expect(screen.getByText('Small')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Large')).toBeInTheDocument();
  });

  it('supports fullWidth', () => {
    renderWithTheme(<Button fullWidth>Full Width</Button>);
    const button = screen.getByText('Full Width');
    expect(button.style.width).toBe('100%');
  });

  it('works without ThemeProvider (fallback to dark theme)', () => {
    render(<Button>No Provider</Button>);
    expect(screen.getByText('No Provider')).toBeInTheDocument();
  });
});
