import * as React from "react";
/** The FIBI logo. Never redraw or recolour it — always render the supplied artwork. */
export interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** mark = glyph only, full = glyph + wordmark (transparent), dark/light = original lockups. */
  variant?: "mark" | "full" | "dark" | "light";
  height?: number;
  /** Override the file name if your app copies assets elsewhere. */
  src?: string;
}
export declare function Logo(props: LogoProps): JSX.Element;
