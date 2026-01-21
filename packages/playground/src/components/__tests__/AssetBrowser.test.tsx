
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AssetBrowser from '../AssetBrowser';
import { usePlaygroundStore } from '../../hooks/usePlaygroundStore';
import { LibraryService } from '../../services/LibraryService';

// Mock store and service
vi.mock('../../hooks/usePlaygroundStore');
vi.mock('../../services/LibraryService');

describe('AssetBrowser', () => {
  const setCodeMock = vi.fn();
  const mockStore = {
    editor: { code: 'existing code' },
    setCode: setCodeMock,
  };

  const mockManifest = {
    name: "Test Lib",
    version: "1.0",
    components: [
      {
        id: "Test.Item",
        name: "Test Item",
        category: "Core",
        path: "path",
        exportName: "Test",
        description: "Desc",
        tags: ["tag"]
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (usePlaygroundStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
    (LibraryService.getManifest as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockManifest);
    (LibraryService.getComponentCode as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('export prefab Test {}');
  });

  it('renders library items', async () => {
    render(<AssetBrowser />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeDefined();
    });
  });

  it('inserts code when button clicked', async () => {
    render(<AssetBrowser />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeDefined();
    });

    // Hover logic might make button invisible to 'getByText' if strict, but let's try
    // We might need to query by role or just assume visibility isn't checked by jsdom
    const insertBtn = screen.getByText('Insert +');
    fireEvent.click(insertBtn);

    await waitFor(() => {
      expect(setCodeMock).toHaveBeenCalledWith('existing code\n\nexport prefab Test {}');
    });
  });
});
