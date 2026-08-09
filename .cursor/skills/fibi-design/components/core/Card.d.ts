import * as React from "react";
/**
 * The container for everything. 22px radius, hairline border, whisper-soft shadow.
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: "none" | "sm" | "md" | "lg";
  /** Adds lift-on-hover and a pointer cursor. */
  interactive?: boolean;
  padding?: string;
  tone?: "surface" | "subtle" | "night" | "brand";
}
export declare function Card(props: CardProps): JSX.Element;
