import * as React from "react";
/** A collection (city, trip, mood) on the home grid. */
export interface CollectionTileProps { name: string; count?: number; tone?: "sky" | "brand" | "night" | "soft"; cover?: string; onClick?: () => void; style?: React.CSSProperties }
export declare function CollectionTile(props: CollectionTileProps): JSX.Element;
