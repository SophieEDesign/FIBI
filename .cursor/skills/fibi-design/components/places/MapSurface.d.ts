import * as React from "react";
/**
 * Map backdrop for place screens. Tiles are OpenStreetMap, desaturated to FIBI's calm range —
 * swap for the product's real tile provider in production.
 */
export interface MapSurfaceProps { center?: [number, number]; zoom?: number; cols?: number; rows?: number; children?: React.ReactNode; style?: React.CSSProperties }
export declare function MapSurface(props: MapSurfaceProps): JSX.Element;
