import * as React from "react";
/** Circular icon-only control for map overlays, toolbars and card corners. */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  /** Required — becomes aria-label and tooltip. */
  label: string;
  variant?: "ghost" | "surface" | "glass" | "accent";
  size?: "sm" | "md" | "lg";
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
