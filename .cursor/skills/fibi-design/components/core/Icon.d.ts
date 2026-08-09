import * as React from "react";
/** Lucide glyph wrapper. FIBI has no proprietary icon set — see readme.md > Iconography. */
export interface IconProps {
  /** Lucide icon name, kebab-case, e.g. "map-pin", "bookmark", "share". */
  name: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  style?: React.CSSProperties;
}
export declare function Icon(props: IconProps): JSX.Element;
