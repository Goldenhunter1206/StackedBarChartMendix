import { ReactElement, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmCaption: string;
    cancelCaption: string;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Modal confirmation for a drag, rendered by the widget itself.
 *
 * Doing it here rather than through a Mendix page means the widget knows the
 * outcome immediately, so a cancel can simply drop the optimistic move instead
 * of waiting to see whether the data comes back changed.
 */
export function ConfirmDialog(props: ConfirmDialogProps): ReactElement {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        ref.current?.querySelector<HTMLButtonElement>(".sbc-dialog-confirm")?.focus();
    }, []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                event.stopPropagation();
                props.onCancel();
                return;
            }
            if (event.key !== "Tab") {
                return;
            }
            // Keep focus inside the dialog for as long as it is open.
            const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
            if (buttons.length === 0) {
                return;
            }
            const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
            const next = (current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
            event.preventDefault();
            buttons[next].focus();
        };

        document.addEventListener("keydown", onKeyDown, true);
        return () => document.removeEventListener("keydown", onKeyDown, true);
    }, [props]);

    return createPortal(
        <div className="sbc-backdrop" onPointerDown={props.onCancel}>
            <div
                ref={ref}
                className="sbc-dialog"
                role="alertdialog"
                aria-modal="true"
                aria-label={props.title}
                onPointerDown={event => event.stopPropagation()}
            >
                <h2 className="sbc-dialog-title">{props.title}</h2>
                <p className="sbc-dialog-message">{props.message}</p>
                <div className="sbc-dialog-actions">
                    <button type="button" className="sbc-dialog-cancel" onClick={props.onCancel}>
                        {props.cancelCaption}
                    </button>
                    <button type="button" className="sbc-dialog-confirm" onClick={props.onConfirm}>
                        {props.confirmCaption}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
