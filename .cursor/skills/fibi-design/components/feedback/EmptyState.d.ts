import * as React from "react";
/** The calm nothing-here moment — FIBI leans on these rather than skeleton noise. */
export interface EmptyStateProps { icon?: React.ReactNode; title?: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; style?: React.CSSProperties }
export declare function EmptyState(props: EmptyStateProps): JSX.Element;
