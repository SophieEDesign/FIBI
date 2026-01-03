// Shared Google Maps type definitions
// This file consolidates all Google Maps API type declarations to avoid conflicts

// Define the google namespace for type references
// This must be declared at the top level (not inside declare global) to be globally available
declare namespace google {
  namespace maps {
    interface Map {
      getZoom(): number | null
      getBounds(): LatLngBounds | null
      getProjection(): Projection | null
      fitBounds(bounds: LatLngBounds): void
      addListener(eventName: string, handler: () => void): MapsEventListener
      padding?: {
        top: number
        right: number
        bottom: number
        left: number
      }
    }

    interface Marker {
      setMap(map: Map | null): void
      addListener(eventName: string, handler: () => void): MapsEventListener
    }

    interface LatLngBounds {
      extend(latLng: LatLng): void
      getNorthEast(): LatLng
    }

    interface LatLng {
      lat(): number
      lng(): number
    }

    interface Projection {
      fromLatLngToPoint(latLng: LatLng): Point
    }

    interface Point {
      x: number
      y: number
    }

    interface MapsEventListener {}

    interface MapOptions {
      zoom?: number
      center?: { lat: number; lng: number }
      mapTypeId?: any
      styles?: MapTypeStyle[]
      disableDefaultUI?: boolean
      zoomControl?: boolean
      mapTypeControl?: boolean
      streetViewControl?: boolean
      fullscreenControl?: boolean
    }

    interface MarkerOptions {
      position?: LatLng
      map?: Map
      icon?: any
      title?: string
      animation?: any
    }

    interface InfoWindowOptions {
      content?: string
      position?: LatLng
    }

    interface MapTypeStyle {
      featureType?: string
      elementType?: string
      stylers?: Array<{ [key: string]: any }>
    }
  }
}

// Export empty object to make this a module (required for namespace declarations)
export {}

declare global {
  interface Window {
    google: {
      maps: {
        // Places API (used by GooglePlacesInput)
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
        // Event handling (used by both components)
        event: {
          clearInstanceListeners: (instance: any) => void
          removeListener: (listener: google.maps.MapsEventListener) => void
        }
        // Map API (used by MapView)
        Map: new (element: HTMLElement, options?: google.maps.MapOptions) => google.maps.Map
        Marker: new (options?: google.maps.MarkerOptions) => google.maps.Marker
        InfoWindow: new (options?: google.maps.InfoWindowOptions) => google.maps.InfoWindow
        LatLng: new (lat: number, lng: number) => google.maps.LatLng
        LatLngBounds: new () => google.maps.LatLngBounds
        Point: new (x: number, y: number) => google.maps.Point
        SymbolPath: {
          CIRCLE: any
        }
        Animation: {
          DROP: any
        }
        MapTypeId: {
          ROADMAP: any
        }
      }
    }
    initGooglePlaces: () => void
  }
}

export {}

