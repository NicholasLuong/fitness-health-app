import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Modal } from './ui'

const originalVisualViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport')

afterEach(() => {
  if (originalVisualViewport) Object.defineProperty(window, 'visualViewport', originalVisualViewport)
  else Reflect.deleteProperty(window, 'visualViewport')
})

describe('Modal', () => {
  it('tracks the visible viewport when the software keyboard changes it', () => {
    const viewportEvents = new EventTarget()
    let height = 510
    let offsetTop = 112
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        get height() { return height },
        get offsetTop() { return offsetTop },
        addEventListener: viewportEvents.addEventListener.bind(viewportEvents),
        removeEventListener: viewportEvents.removeEventListener.bind(viewportEvents)
      }
    })

    render(<Modal title="Add fresh groceries" onClose={() => undefined}><textarea aria-label="Fresh ingredients" /></Modal>)
    const backdrop = screen.getByRole('dialog').parentElement
    expect(backdrop).toHaveStyle({ top: '112px', height: '510px' })

    height = 420
    offsetTop = 148
    act(() => viewportEvents.dispatchEvent(new Event('resize')))
    expect(backdrop).toHaveStyle({ top: '148px', height: '420px' })
  })
})
