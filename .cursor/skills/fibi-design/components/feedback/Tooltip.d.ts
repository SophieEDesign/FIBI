import * as React from "react";
/** Hover hint for icon-only controls on desktop. Never the only affordance on touch. */
export interface TooltipProps { label: React.ReactNode; placement?: "top" | "bottom" | "right"; children?: React.ReactNode }
export declare function Tooltip(props: TooltipProps): JSX.Element;
