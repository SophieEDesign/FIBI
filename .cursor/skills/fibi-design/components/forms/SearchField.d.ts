import * as React from "react";
/** Pill search field — the app's primary way into a saved list. */
export interface SearchFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>,"onChange"> {
  value?: string; onChange?: (value: string) => void; onClear?: () => void; placeholder?: string;
}
export declare function SearchField(props: SearchFieldProps): JSX.Element;
