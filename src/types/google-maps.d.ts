// Shared Google Maps type definitions
// This file consolidates all Google Maps API type declarations to avoid conflicts

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

