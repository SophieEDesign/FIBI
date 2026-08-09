import * as React from "react";
/** Single-choice control. Group by shared `name`. */
export interface RadioProps { checked?: boolean; onChange?: (value: string, e: React.ChangeEvent) => void; label?: React.ReactNode; name?: string; value?: string; disabled?: boolean; style?: React.CSSProperties }
export declare function Radio(props: RadioProps): JSX.Element;
