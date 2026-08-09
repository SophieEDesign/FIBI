import * as React from "react";
/** Transient confirmation. One at a time, bottom-centre, auto-dismiss ~3s. */
export interface ToastProps { tone?: "neutral" | "success" | "danger"; icon?: React.ReactNode; action?: string; onAction?: () => void; style?: React.CSSProperties; children?: React.ReactNode }
export declare function Toast(props: ToastProps): JSX.Element;
