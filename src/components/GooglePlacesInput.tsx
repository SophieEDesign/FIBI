'use client'

import { useEffect, useRef, useState } from 'react'

interface GooglePlace {
  place_name: string
  place_id: string
  latitude: number
  longitude: number
  formatted_address: string
  city: string | null
  country: string | null
}

interface GooglePlacesInputProps {
  value: string
  onChange: (place: GooglePlace | null) => void
  onManualCityChange?: (city: string) => void
  onManualCountryChange?: (country: string) => void
  manualCity?: string
  manualCountry?: string
  placeholder?: string
  className?: string
  id?: string
  disabled?: boolean
}

declare global {
  interface Window {
    google: {
      maps: {
        places: {
          Autocomplete: new (
            inputField: HTMLInputElement,
            options?: {
              types?: string[]
              fields?: string[]
            }
          ) => {
            getPlace: () => {
              place_id?: string
              name?: string
              formatted_address?: string
              geometry?: {
                location: {
                  lat: () => number
                  lng: () => number
                }
              }
              address_components?: Array<{
                long_name: string
                types: string[]
              }>
            }
            addListener: (event: string, callback: () => void) => void
          }
        }
        event: {
          clearInstanceListeners: (instance: any) => void
        }
      }
    }
    initGooglePlaces: () => void
  }
}

export default function GooglePlacesInput({
  value,
  onChange,
  onManualCityChange,
  onManualCountryChange,
  manualCity: propManualCity = '',
  manualCountry: propManualCountry = '',
  placeholder = 'Search Google Maps for a place',
  className = '',
  id,
  disabled = false,
}: GooglePlacesInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<InstanceType<typeof window.google.maps.places.Autocomplete> | null>(null)
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)
  const [hasSelectedPlace, setHasSelectedPlace] = useState(false)
  const [manualCity, setManualCity] = useState(propManualCity)
  const [manualCountry, setManualCountry] = useState(propManualCountry)

  // Sync with props when they change
  useEffect(() => {
    setManualCity(propManualCity)
  }, [propManualCity])

  useEffect(() => {
    setManualCountry(propManualCountry)
  }, [propManualCountry])

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      console.warn('Google Maps API key not found. Location search will not work.')
      return
    }

    // Check if script is already loaded
    if (window.google?.maps?.places) {
      setIsGoogleLoaded(true)
      return
    }

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      // Wait for it to load
      existingScript.addEventListener('load', () => {
        setIsGoogleLoaded(true)
      })
      return
    }

    // Load the script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => {
      setIsGoogleLoaded(true)
    }
    document.head.appendChild(script)

    return () => {
      // Cleanup: remove script if component unmounts (optional, usually not needed)
    }
  }, [])

  // Initialize Autocomplete when Google is loaded
  useEffect(() => {
    if (!isGoogleLoaded || !inputRef.current || disabled) return

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) return

    // Initialize Autocomplete
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment', 'geocode'],
      fields: ['place_id', 'name', 'formatted_address', 'geometry', 'address_components'],
    })

    autocompleteRef.current = autocomplete

    // Handle place selection
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()

      if (!place.place_id || !place.geometry?.location) {
        return
      }

      // Extract city and country from address_components
      let city: string | null = null
      let country: string | null = null

      if (place.address_components) {
        for (const component of place.address_components) {
          if (component.types.includes('locality')) {
            city = component.long_name
          } else if (component.types.includes('country')) {
            country = component.long_name
          }
        }
      }

      const googlePlace: GooglePlace = {
        place_name: place.name || '',
        place_id: place.place_id,
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng(),
        formatted_address: place.formatted_address || '',
        city,
        country,
      }

      setHasSelectedPlace(true)
      setManualCity('')
      setManualCountry('')
      onChange(googlePlace)
    })

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [isGoogleLoaded, onChange, disabled])

  // Handle manual input (when user types without selecting)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // If user clears the input or changes it after selecting a place, reset
    if (!inputValue || (hasSelectedPlace && inputValue !== value)) {
      setHasSelectedPlace(false)
      onChange(null)
      setManualCity('')
      setManualCountry('')
      if (onManualCityChange) onManualCityChange('')
      if (onManualCountryChange) onManualCountryChange('')
    }
  }

  // Handle manual city/country entry (fallback)
  const handleManualCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const city = e.target.value
    setManualCity(city)
    if (onManualCityChange) onManualCityChange(city)
    // Clear Google place data when manually entering
    if (hasSelectedPlace) {
      setHasSelectedPlace(false)
      onChange(null)
    }
  }

  const handleManualCountryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const country = e.target.value
    setManualCountry(country)
    if (onManualCountryChange) onManualCountryChange(country)
    // Clear Google place data when manually entering
    if (hasSelectedPlace) {
      setHasSelectedPlace(false)
      onChange(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={id || 'location-search'} className="block text-sm font-medium text-gray-700 mb-2">
          Location (optional)
        </label>
        <input
          ref={inputRef}
          id={id || 'location-search'}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled || !isGoogleLoaded}
          className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
            disabled || !isGoogleLoaded ? 'bg-gray-100 cursor-not-allowed' : ''
          } ${className}`}
        />
        {!isGoogleLoaded && (
          <p className="mt-1 text-xs text-gray-500">Loading location search...</p>
        )}
      </div>

      {/* Manual fallback inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={`${id || 'location'}-city`} className="block text-sm font-medium text-gray-700 mb-2">
            City
          </label>
          <input
            id={`${id || 'location'}-city`}
            type="text"
            value={manualCity}
            onChange={handleManualCityChange}
            placeholder="e.g. London"
            disabled={disabled}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor={`${id || 'location'}-country`} className="block text-sm font-medium text-gray-700 mb-2">
            Country
          </label>
          <input
            id={`${id || 'location'}-country`}
            type="text"
            value={manualCountry}
            onChange={handleManualCountryChange}
            placeholder="e.g. United Kingdom"
            disabled={disabled}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  )
}

