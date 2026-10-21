import { describe, expect, it } from 'vitest'
import { buildLocationSearchQuery } from '@/lib/geocode-place'

describe('buildLocationSearchQuery', () => {
  it('joins place, city, and country', () => {
    expect(
      buildLocationSearchQuery({
        placeName: 'Café XYZ',
        city: 'Lisbon',
        country: 'Portugal',
      })
    ).toBe('Café XYZ, Lisbon, Portugal')
  })

  it('works with city only', () => {
    expect(buildLocationSearchQuery({ city: 'Bali' })).toBe('Bali')
  })

  it('returns null when empty', () => {
    expect(buildLocationSearchQuery({})).toBeNull()
    expect(buildLocationSearchQuery({ placeName: '  ' })).toBeNull()
  })
})
