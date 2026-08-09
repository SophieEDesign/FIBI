import * as React from "react";
/** Native select styled to match Input. */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: (string | { value: string; label: string })[];
  error?: boolean;
}
export declare function Select(props: SelectProps): JSX.Element;
