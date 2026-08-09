import * as React from "react";
/**
 * Modal dialog. `sheet` variant is the mobile bottom sheet used across the app.
 */
export interface DialogProps {
  open?: boolean; onClose?: () => void;
  title?: React.ReactNode; description?: React.ReactNode; footer?: React.ReactNode;
  variant?: "center" | "sheet"; width?: number; children?: React.ReactNode;
}
export declare function Dialog(props: DialogProps): JSX.Element | null;
