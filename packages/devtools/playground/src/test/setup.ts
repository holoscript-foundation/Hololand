import '@testing-library/jest-dom/vitest'

// Mock scrollIntoView for jsdom
window.HTMLElement.prototype.scrollIntoView = function() {}
