import * as React from "react";
/** Small status pill. Read-only — never interactive. */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "info" | "success" | "warn" | "danger" | "brand";
  icon?: React.ReactNode;
}
export declare function Badge(props: BadgeProps): JSX.Element;
