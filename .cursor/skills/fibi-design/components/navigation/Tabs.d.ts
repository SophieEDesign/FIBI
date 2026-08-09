import * as React from "react";
/**
 * In-page section switch: underline on desktop, segmented pill on mobile.
 */
export interface TabsProps {
  items: (string | { value: string; label: string; count?: number })[];
  value?: string; onChange?: (value: string) => void;
  variant?: "underline" | "segmented"; style?: React.CSSProperties;
}
export declare function Tabs(props: TabsProps): JSX.Element;
