import { describe, expect, it, vi } from 'vitest'
import { clickableRowProps, toOptionalNumber, toPositiveInt } from './form'

describe('toPositiveInt', () => {
  it('parse un entier positif', () => {
    expect(toPositiveInt('5', 1)).toBe(5)
    expect(toPositiveInt('1', 9)).toBe(1)
  })

  it('renvoie le fallback pour une saisie vide', () => {
    expect(toPositiveInt('', 3)).toBe(3)
  })

  it('renvoie le fallback pour NaN / non numérique', () => {
    expect(toPositiveInt('abc', 7)).toBe(7)
  })

  it('rejette 0 et les négatifs (garde le fallback)', () => {
    expect(toPositiveInt('0', 2)).toBe(2)
    expect(toPositiveInt('-4', 2)).toBe(2)
  })

  it('rejette les décimaux (non entiers)', () => {
    expect(toPositiveInt('2.5', 1)).toBe(1)
  })
})

describe('toOptionalNumber', () => {
  it('renvoie undefined pour une chaîne vide ou espaces', () => {
    expect(toOptionalNumber('')).toBeUndefined()
    expect(toOptionalNumber('   ')).toBeUndefined()
  })

  it('renvoie undefined pour une saisie non numérique (pas NaN)', () => {
    expect(toOptionalNumber('abc')).toBeUndefined()
  })

  it('parse les nombres valides, y compris décimaux et 0', () => {
    expect(toOptionalNumber('0')).toBe(0)
    expect(toOptionalNumber('2.5')).toBe(2.5)
    expect(toOptionalNumber('-3')).toBe(-3)
  })
})

describe('clickableRowProps', () => {
  it('expose role/tabIndex et déclenche onClick au clic', () => {
    const onClick = vi.fn()
    const props = clickableRowProps(onClick)
    expect(props.role).toBe('button')
    expect(props.tabIndex).toBe(0)
    props.onClick()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('active sur Entrée / Espace uniquement depuis la ligne elle-même', () => {
    const onClick = vi.fn()
    const { onKeyDown } = clickableRowProps(onClick)
    const target = {} as EventTarget
    const make = (key: string, sameTarget: boolean) =>
      ({
        key,
        target,
        currentTarget: sameTarget ? target : ({} as EventTarget),
        preventDefault: vi.fn(),
      }) as unknown as React.KeyboardEvent

    onKeyDown(make('Enter', true))
    onKeyDown(make(' ', true))
    expect(onClick).toHaveBeenCalledTimes(2)

    // Touche non concernée
    onKeyDown(make('a', true))
    // Événement venant d'un bouton imbriqué (target !== currentTarget)
    onKeyDown(make('Enter', false))
    expect(onClick).toHaveBeenCalledTimes(2)
  })
})
