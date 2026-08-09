import * as React from "react";
/** Checkbox with label. */
export interface CheckboxProps { checked?: boolean; onChange?: (checked: boolean, e: React.ChangeEvent) => void; label?: React.ReactNode; disabled?: boolean; style?: React.CSSProperties }
export declare function Checkbox(props: CheckboxProps): JSX.Element;
