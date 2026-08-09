import * as React from "react";
/** Multi-line note field — used for "why you saved it". */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { error?: boolean }
export declare function Textarea(props: TextareaProps): JSX.Element;
