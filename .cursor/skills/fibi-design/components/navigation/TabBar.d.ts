import * as React from "react";
/** Bottom tab bar for the FIBI app shell — 64px, frosted, 3–4 destinations. */
export interface TabBarProps {
  items: { value: string; label: string; icon?: React.ReactNode }[];
  value?: string; onChange?: (value: string) => void; style?: React.CSSProperties;
}
export declare function TabBar(props: TabBarProps): JSX.Element;
