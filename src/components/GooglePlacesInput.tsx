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
  // Use a ref to track if we just set the value from a place selection
  const justSetFromPlaceRef = useRef({ city: false, country: false })
  
  useEffect(() => {
    // Only sync if we didn't just set it from a place selection
    // Also check if the prop value matches what we have locally (to avoid unnecessary updates)
    if (!justSetFromPlaceRef.current.city) {
      if (propManualCity !== manualCity) {
        console.log('GooglePlacesInput: Syncing city prop:', { propManualCity, manualCity })
        setManualCity(propManualCity)
      }
    } else {
      // Flag is set - don't sync, but reset the flag after a longer delay
      // This prevents the parent's state update from overwriting what we just set
      // Use 500ms to ensure parent state has fully updated
      const timeoutId = setTimeout(() => {
        justSetFromPlaceRef.current.city = false
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [propManualCity, manualCity])

  useEffect(() => {
    if (!justSetFromPlaceRef.current.country) {
      if (propManualCountry !== manualCountry) {
        console.log('GooglePlacesInput: Syncing country prop:', { propManualCountry, manualCountry })
        setManualCountry(propManualCountry)
      }
    } else {
      // Flag is set - don't sync, but reset the flag after a longer delay
      // Use 500ms to ensure parent state has fully updated
      const timeoutId = setTimeout(() => {
        justSetFromPlaceRef.current.country = false
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [propManualCountry, manualCountry])

  // Sync search value with prop only when it changes from parent (e.g., place selection)
  // Don't override user typing
  useEffect(() => {
    // If value prop changes and it's different from current value, sync it
    // This handles both initial load (when value is set from saved data) and updates
    if (value !== locationSearchValue) {
      // Sync if:
      // 1. We don't have a selected place (user hasn't selected a place yet), OR
      // 2. The value is being set from parent (e.g., loading saved data), OR
      // 3. The value is being cleared (empty string) - this is a programmatic clear
      if (!hasSelectedPlace || (value && value !== locationSearchValue) || (!value && locationSearchValue)) {
        console.log('GooglePlacesInput: Syncing value prop to internal state:', { value, locationSearchValue, hasSelectedPlace })
        setLocationSearchValue(value)
        // If value is being cleared, also clear hasSelectedPlace
        if (!value || !value.trim()) {
          setHasSelectedPlace(false)
          // Also clear the Autocomplete input field if it exists
          if (inputRef.current && autocompleteRef.current) {
            inputRef.current.value = ''
          }
        } else if (value && value.trim()) {
          // If value is being set and it's not empty, mark that we have a selected place
          // This happens when loading saved data
          setHasSelectedPlace(true)
        }
      }
    }
  }, [value, locationSearchValue, hasSelectedPlace])

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
    script.onerror = (error) => {
      console.error('Failed to load Google Maps script:', error)
      // Don't set isGoogleLoaded to true on error - manual entry will still work
      // The component will show a message that manual entry is available
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
      console.log('GooglePlacesInput: place_changed event fired')
      const place = autocomplete.getPlace()
      console.log('GooglePlacesInput: Raw place data:', place)

      if (!place.place_id || !place.geometry?.location) {
        console.warn('GooglePlacesInput: Place missing place_id or geometry.location:', {
          hasPlaceId: !!place.place_id,
          hasGeometry: !!place.geometry,
          hasLocation: !!place.geometry?.location,
        })
        return
      }

      // Extract city and country from address_components
      // Try multiple types for city (locality, administrative_area_level_2, administrative_area_level_1)
      let city: string | null = null
      let country: string | null = null
      let postalTown: string | null = null
      let sublocality: string | null = null
      let administrativeArea2: string | null = null
      let administrativeArea1: string | null = null

      if (place.address_components) {
        console.log('GooglePlacesInput: Address components:', place.address_components.map(ac => ({
          long_name: ac.long_name,
          short_name: ac.short_name,
          types: ac.types,
        })))
        
        for (const component of place.address_components) {
          // City: try multiple types in priority order
          if (!city) {
            if (component.types.includes('locality')) {
              city = component.long_name
            } else if (component.types.includes('postal_town')) {
              postalTown = component.long_name
            } else if (component.types.includes('sublocality') || component.types.includes('sublocality_level_1')) {
              sublocality = component.long_name
            }
          }
          
          // Administrative areas (fallback for city)
          if (component.types.includes('administrative_area_level_2')) {
            administrativeArea2 = component.long_name
          } else if (component.types.includes('administrative_area_level_1')) {
            administrativeArea1 = component.long_name
          }
          
          // Country
          if (component.types.includes('country')) {
            country = component.long_name
          }
        }
        
        // Use postal_town or sublocality as city if no locality found
        if (!city) {
          city = postalTown || sublocality || administrativeArea2 || administrativeArea1
        }
        
        // If still no city, try parsing from formatted_address or place name
        // For cities like "Valencia, Spain", the place name might be the city
        if (!city && place.name) {
          // Check if place name looks like a city name (not too long, no special chars)
          const placeName = place.name.trim()
          if (placeName.length < 50 && !placeName.includes(',')) {
            // If formatted_address contains the place name, it's likely the city
            if (place.formatted_address && place.formatted_address.includes(placeName)) {
              city = placeName
            }
          }
        }
      }
      
      console.log('GooglePlacesInput: Extracted location data:', { city, country, postalTown, sublocality })

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
        address_components: place.address_components?.map(ac => ({
          long_name: ac.long_name,
          types: ac.types,
        })),
      })

      // CRITICAL: Update all state synchronously and call onChange immediately
      // Set flags FIRST to prevent useEffect from overwriting when parent updates props
      justSetFromPlaceRef.current.city = true
      justSetFromPlaceRef.current.country = true
      
      // Update local state immediately
      const cityValue = googlePlace.city || ''
      const countryValue = googlePlace.country || ''
      
      setHasSelectedPlace(true)
      setLocationSearchValue(googlePlace.place_name)
      setManualCity(cityValue)
      setManualCountry(countryValue)
      
      // CRITICAL: Notify parent callbacks immediately and synchronously
      // Call these BEFORE onChange to ensure parent state is ready
      if (onManualCityChange) {
        onManualCityChange(cityValue)
      }
      if (onManualCountryChange) {
        onManualCountryChange(countryValue)
      }
      
      // CRITICAL: Call onChange immediately - this must happen synchronously
      // Use a small setTimeout(0) only if we need to ensure DOM is ready, but try without first
      onChange(googlePlace)
      
      // Also update input value directly to ensure it shows the place name
      if (inputRef.current) {
        inputRef.current.value = googlePlace.place_name
      }
      
      // Reset flags after parent has had time to update
      // Use 500ms to match the useEffect timeout
      setTimeout(() => {
        justSetFromPlaceRef.current.city = false
        justSetFromPlaceRef.current.country = false
      }, 500)
    })

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGoogleLoaded, disabled]) // Removed onChange from deps to prevent listener recreation

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
          className={`w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
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
            className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white"
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
            className="w-full px-4 py-2 border border-gray-400 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-white"
          />
        </div>
      </div>
    </div>
  )
}

