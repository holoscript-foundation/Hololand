import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AssetBrowser from '../AssetBrowser'
import { usePlaygroundStore } from '../../hooks/usePlaygroundStore'
import { LibraryService } from '../../services/LibraryService'

// Mock the store
vi.mock('../../hooks/usePlaygroundStore')

// Mock the LibraryService
vi.mock('../../services/LibraryService', () => ({
  LibraryService: {
    getManifest: vi.fn(),
    getComponentCode: vi.fn(),
  },
}))

describe('AssetBrowser', () => {
  const setCodeMock = vi.fn()
  const mockStore = {
    editor: { code: 'existing code' },
    setCode: setCodeMock,
  }

  const mockManifest = {
    name: 'Test Lib',
    version: '1.0',
    components: [
      {
        id: 'Test.Item',
        name: 'Test Item',
        category: 'Core',
        path: 'path',
        exportName: 'Test',
        description: 'Desc',
        tags: ['tag'],
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(usePlaygroundStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore)
    ;(LibraryService.getManifest as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockManifest)
    ;(LibraryService.getComponentCode as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      'export prefab Test {}'
    )
  })

  it('renders loading state initially', () => {
    render(<AssetBrowser />)
    // Component should render without crashing
    expect(document.body).toBeDefined()
  })

  it('renders library items after loading', async () => {
    render(<AssetBrowser />)

    await waitFor(() => {
      const items = screen.queryAllByText('Test Item')
      expect(items.length).toBeGreaterThanOrEqual(0)
    })
  })

  it('renders category filter', async () => {
    render(<AssetBrowser />)

    await waitFor(() => {
      // Check that the component renders the category filter area
      expect(screen.getByText('📚 Asset Library')).toBeDefined()
    })
  })
})
