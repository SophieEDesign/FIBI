import * as React from "react";
/** User-facing label / filter chip. Selected state is the deep indigo fill. */
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  selected?: boolean;
  interactive?: boolean;
  icon?: React.ReactNode;
  onRemove?: (e: React.MouseEvent) => void;
}
export declare function Tag(props: TagProps): JSX.Element;
