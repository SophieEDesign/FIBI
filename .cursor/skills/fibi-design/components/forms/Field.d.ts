import * as React from "react";
/** Label + hint + error scaffold. Wrap any control that needs a label. */
export interface FieldProps {
  label?: string; hint?: string; error?: string; required?: boolean; htmlFor?: string;
  style?: React.CSSProperties; children?: React.ReactNode;
}
export declare function Field(props: FieldProps): JSX.Element;
