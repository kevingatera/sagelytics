export interface GeoLocation {
  address: string;
  latitude: number;
  longitude: number;
  country: string;
  region: string;
  city: string;
  postalCode?: string;
  formattedAddress: string;
}

export interface LocationContext {
  location: GeoLocation;
  radius: number; // in kilometers
  timezone?: string;
} 