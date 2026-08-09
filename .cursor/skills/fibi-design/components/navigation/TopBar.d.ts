import * as React from "react";
/** Sticky app/site header. Frosted glass by default, transparent over media. */
export interface TopBarProps { title?: React.ReactNode; left?: React.ReactNode; right?: React.ReactNode; transparent?: boolean; style?: React.CSSProperties; children?: React.ReactNode }
export declare function TopBar(props: TopBarProps): JSX.Element;
