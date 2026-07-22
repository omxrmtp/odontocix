import { describe, it, expect, vi } from 'vitest'
import { onlyDigits, onlyLetters, cleanInput } from './validation'

describe('onlyDigits', () => {
  it('allows digit keys', () => {
    const e = { key: '5', preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLInputElement>
    onlyDigits(e)
    expect(e.preventDefault).not.toHaveBeenCalled()
  })

  it('prevents non-digit keys', () => {
    const e = { key: 'a', preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLInputElement>
    onlyDigits(e)
    expect(e.preventDefault).toHaveBeenCalled()
  })

  it('allows special keys (Backspace)', () => {
    const e = { key: 'Backspace', preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLInputElement>
    onlyDigits(e)
    expect(e.preventDefault).not.toHaveBeenCalled()
  })
})

describe('onlyLetters', () => {
  it('allows letter keys', () => {
    const e = { key: 'a', preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLInputElement>
    onlyLetters(e)
    expect(e.preventDefault).not.toHaveBeenCalled()
  })

  it('allows space keys', () => {
    const e = { key: ' ', preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLInputElement>
    onlyLetters(e)
    expect(e.preventDefault).not.toHaveBeenCalled()
  })

  it('prevents digit keys', () => {
    const e = { key: '1', preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLInputElement>
    onlyLetters(e)
    expect(e.preventDefault).toHaveBeenCalled()
  })
})

describe('cleanInput', () => {
  it('removes non-digits for digits type', () => {
    expect(cleanInput('abc123', 'digits')).toBe('123')
  })

  it('removes non-letters for letters type', () => {
    expect(cleanInput('abc123', 'letters')).toBe('abc')
  })

  it('keeps phone characters for phone type', () => {
    expect(cleanInput('abc123+45-67 89', 'phone')).toBe('123+45-67 89')
  })

  it('keeps decimal characters for decimal type', () => {
    expect(cleanInput('abc123.45', 'decimal')).toBe('123.45')
  })
})
