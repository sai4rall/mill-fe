import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())

// Mantine (v2 UI) needs these browser APIs, which jsdom lacks.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  })
}
if (!window.ResizeObserver) {
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
}
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
// Mantine's autosize Textarea listens to font loading; jsdom has no document.fonts.
if (!document.fonts) {
  Object.defineProperty(document, 'fonts', { value: { addEventListener: () => {}, removeEventListener: () => {}, ready: Promise.resolve() } })
}
// Radix (v3 UI) uses pointer capture for selects and sliders.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
}
// Calendar popovers (v3/v4) probe the element under the pointer; jsdom has no layout.
if (!document.elementFromPoint) document.elementFromPoint = () => null
