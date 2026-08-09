import * as React from "react";
/**
 * A saved place — FIBI's atomic content unit. Media on top (or left in `row`), source pill
 * over the image, name, location, the user's own note, then their tags.
 */
export interface PlaceCardProps {
  name: string;
  location?: string;
  /** The user's own reason for saving. Verbatim — never rewritten. */
  note?: string;
  /** Screenshot or pulled-through preview image. Omit for the brand-wash placeholder. */
  image?: string;
  source?: "tiktok" | "instagram" | "youtube" | "link";
  tags?: string[];
  saved?: boolean;
  layout?: "vertical" | "row";
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function PlaceCard(props: PlaceCardProps): JSX.Element;
