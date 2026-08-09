import * as React from "react";
/** Map pin. Echoes the dot-and-pin motif in the FIBI logo. */
export interface PinMarkerProps { tone?: "default" | "saved" | "visited" | "muted"; size?: number; label?: string; active?: boolean; style?: React.CSSProperties }
export declare function PinMarker(props: PinMarkerProps): JSX.Element;
