import * as React from "react";
/**
 * FIBI's primary action control — pill-shaped, calm, one accent per view.
 */
export interface ButtonProps extends React.HTMLAttributes<HTMLElement> {
  /** Visual weight. Use `gradient` at most once per screen. */
  variant?: "primary" | "gradient" | "secondary" | "ghost" | "soft" | "danger";
  size?: "sm" | "md" | "lg";
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  /** Renders an <a> instead of a <button>. */
  href?: string;
}
export declare function Button(props: ButtonProps): JSX.Element;
