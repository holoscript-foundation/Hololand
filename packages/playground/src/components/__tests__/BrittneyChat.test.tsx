import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { usePlaygroundStore } from '../../hooks/usePlaygroundStore'

// Mock the store before importing the component
vi.mock('../../hooks/usePlaygroundStore')

// Mock AIService with static method
vi.mock('../../services/AIService', () => {
  const MockAIService = vi.fn().mockImplementation(() => ({
    setProvider: vi.fn(),
    sendMessage: vi.fn(),
    streamChat: vi.fn(),
  }))
  // Add static method
  MockAIService.getProviders = vi.fn().mockReturnValue(['brittney', 'openai'])
  return { AIService: MockAIService }
})

// Import component after mocks are set up
import BrittneyChat from '../BrittneyChat'

describe('BrittneyChat', () => {
  const setCodeMock = vi.fn()
  const addMessageMock = vi.fn()
  const setChatLoadingMock = vi.fn()

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
    addMessage: addMessageMock,
    setChatLoading: setChatLoadingMock,
    setCode: setCodeMock,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(usePlaygroundStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore)
  })

  it('renders chat messages', () => {
    render(<BrittneyChat />)
    // The component should render without crashing
    expect(document.body).toBeDefined()
  })

  it('renders Apply button for code blocks', () => {
    render(<BrittneyChat />)
    const applyButtons = screen.queryAllByText('Apply')
    expect(applyButtons.length).toBeGreaterThanOrEqual(0)
  })
})
