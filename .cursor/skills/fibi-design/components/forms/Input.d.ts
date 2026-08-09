import * as React from "react";
/**
 * Single-line text field. 40px tall, 12px radius, sky focus ring.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  iconLeft?: React.ReactNode; suffix?: React.ReactNode; error?: boolean;
}
export declare function Input(props: InputProps): JSX.Element;
