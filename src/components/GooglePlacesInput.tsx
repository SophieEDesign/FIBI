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
  onSearchValueChange?: (value: string) => void
  onManualCityChange?: (city: string) => void
  onManualCountryChange?: (country: string) => void
  onManualCityBlur?: () => void
  onManualCountryBlur?: () => void
  manualCity?: string
  manualCountry?: string
  placeholder?: string
  className?: string
  id?: string
  disabled?: boolean
}

// Google Maps types are defined in src/types/google-maps.d.ts

export default function GooglePlacesInput({
  value,
  onChange,
  onSearchValueChange,
  onManualCityChange,
  onManualCountryChange,
  onManualCityBlur,
  onManualCountryBlur,
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
  const [locationSearchValue, setLocationSearchValue] = useState(value)

  // Sync with props when they change
  useEffect(() => {
    setManualCity(propManualCity)
  }, [propManualCity])

  useEffect(() => {
    setManualCountry(propManualCountry)
  }, [propManualCountry])

  // Sync search value with prop only when it changes from parent (e.g., place selection)
  // Don't override user typing
  useEffect(() => {
    // Only sync if the value prop changed and we don't have a selected place
    // This prevents overriding user input while typing
    if (!hasSelectedPlace && value !== locationSearchValue) {
      setLocationSearchValue(value)
    }
  }, [value, hasSelectedPlace])

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      console.warn('Google Maps API key not found. Location search will not work. Manual entry is still available.')
      // Still allow manual entry even without API key
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
      // Also check if it's already loaded (in case event already fired)
      if (window.google?.maps?.places) {
        setIsGoogleLoaded(true)
      }
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
    script.onerror = () => {
      console.error('Failed to load Google Maps script')
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
      // Try multiple types for city (locality, administrative_area_level_2, administrative_area_level_1)
      let city: string | null = null
      let country: string | null = null

      if (place.address_components) {
        for (const component of place.address_components) {
          // City: try locality first, then administrative areas
          if (!city) {
            if (component.types.includes('locality')) {
              city = component.long_name
            } else if (component.types.includes('administrative_area_level_2')) {
              city = component.long_name
            } else if (component.types.includes('administrative_area_level_1') && !city) {
              // Use state/province as fallback if no city found
              city = component.long_name
            }
          }
          // Country
          if (component.types.includes('country')) {
            country = component.long_name
          }
        }
      }

      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()

      const googlePlace: GooglePlace = {
        place_name: place.name || '',
        place_id: place.place_id,
        latitude: lat,
        longitude: lng,
        formatted_address: place.formatted_address || '',
        city,
        country,
      }

      console.log('GooglePlacesInput: Place selected:', {
        place_name: googlePlace.place_name,
        place_id: googlePlace.place_id,
        latitude: googlePlace.latitude,
        longitude: googlePlace.longitude,
        city: googlePlace.city,
        country: googlePlace.country,
        formatted_address: googlePlace.formatted_address,
      })

      setHasSelectedPlace(true)
      setLocationSearchValue(googlePlace.place_name)
      
      // Update manual city/country fields with place data (user can override after)
      const cityValue = googlePlace.city || ''
      const countryValue = googlePlace.country || ''
      setManualCity(cityValue)
      setManualCountry(countryValue)
      
      // Notify parent of city/country changes so it can update its state
      if (onManualCityChange) {
        onManualCityChange(cityValue)
      }
      if (onManualCountryChange) {
        onManualCountryChange(countryValue)
      }
      
      // Notify parent of place selection
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
    
    // Always update local state to allow typing
    setLocationSearchValue(inputValue)
    
    // Notify parent of search value change
    if (onSearchValueChange) {
      onSearchValueChange(inputValue)
    }

    // If user clears the input or changes it after selecting a place, reset
    if (!inputValue) {
      setHasSelectedPlace(false)
      onChange(null)
      setManualCity('')
      setManualCountry('')
      if (onManualCityChange) onManualCityChange('')
      if (onManualCountryChange) onManualCountryChange('')
    } else if (hasSelectedPlace) {
      // User is typing after selecting a place - clear the selection
      setHasSelectedPlace(false)
      onChange(null)
    }
  }

  // Handle manual city/country entry (fallback)
  // Allow manual override while keeping the selected place (coordinates preserved)
  const handleManualCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const city = e.target.value
    setManualCity(city)
    if (onManualCityChange) onManualCityChange(city)
    // Don't clear selectedPlace - allow manual override of city/country
    // while keeping the place coordinates
  }

  const handleManualCountryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const country = e.target.value
    setManualCountry(country)
    if (onManualCountryChange) onManualCountryChange(country)
    // Don't clear selectedPlace - allow manual override of city/country
    // while keeping the place coordinates
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
          value={locationSearchValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : ''
          } ${className}`}
        />
        {!isGoogleLoaded && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
          <p className="mt-1 text-xs text-gray-500">Loading location search...</p>
        )}
        {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
          <p className="mt-1 text-xs text-gray-500">Google Maps API key not configured. Manual entry available below.</p>
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
            onBlur={() => {
              if (onManualCityBlur) onManualCityBlur()
            }}
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
            onBlur={() => {
              if (onManualCountryBlur) onManualCountryBlur()
            }}
            placeholder="e.g. United Kingdom"
            disabled={disabled}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  )
}

