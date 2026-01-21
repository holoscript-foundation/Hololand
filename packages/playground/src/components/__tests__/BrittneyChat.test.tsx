
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BrittneyChat from '../BrittneyChat';
import { usePlaygroundStore } from '../../hooks/usePlaygroundStore';

// Mock the store
vi.mock('../../hooks/usePlaygroundStore');

describe('BrittneyChat', () => {
  const setCodeMock = vi.fn();
  const mockStore = {
    chat: {
      messages: [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Here is some code:\n```holoscript\nworld Test {}\n```',
          timestamp: new Date(),
        },
      ],
      isLoading: false,
    },
    editor: {
      code: '',
    },
    addMessage: vi.fn(),
    setChatLoading: vi.fn(),
    setCode: setCodeMock,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (usePlaygroundStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
  });

  it('renders Apply button for code blocks', () => {
    render(<BrittneyChat />);
    expect(screen.getByText('Apply')).toBeDefined();
  });

  it('updates editor code when Apply button is clicked', () => {
    render(<BrittneyChat />);
    
    const applyButton = screen.getByText('Apply');
    fireEvent.click(applyButton);

    expect(setCodeMock).toHaveBeenCalledWith('world Test {}');
  });
});
