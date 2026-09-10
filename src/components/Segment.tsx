import { CSSProperties, memo, ReactElement } from "react";
import classNames from "classnames";

export interface SegmentProps {
    elementKey: string;
    /** Distance in px from the bottom of the stack. */
    y: number;
    height: number;
    color: string;
    radius: number;
    label: string;
    labelColor: string;
    showLabel: boolean;
    /** > 1 when this node stands in for a run of clustered elements. */
    count: number;
    interactive: boolean;
    /** Roving tab index: exactly one segment in the chart is tabbable. */
    tabbable: boolean;
    dimmed: boolean;
    highlighted: boolean;
    dragging: boolean;
    /** True on the render where this element first appears in the data. */
    entering: boolean;
    ariaLabel: string;
}

/**
 * One drawn element.
 *
 * Deliberately handler-free: pointer and keyboard events are delegated to the
 * plot container, so thousands of these can mount without thousands of
 * listeners, and memoisation is not defeated by a new closure per render.
 *
 * Position is applied as a transform rather than as `bottom`, so reordering
 * animates on the compositor without touching layout.
 */
function SegmentComponent(props: SegmentProps): ReactElement {
    const style: CSSProperties = {
        height: `${props.height}px`,
        // Kept in a custom property so the enter keyframes can reuse the exact
        // same offset instead of fighting the inline transform.
        ["--sbc-seg-y" as string]: `${-props.y}px`,
        transform: "translate3d(0, var(--sbc-seg-y), 0)",
        background: props.color,
        ["--sbc-seg-radius" as string]: `${props.radius}px`
    };

    return (
        <div
            className={classNames("sbc-seg", {
                "sbc-seg--interactive": props.interactive,
                "sbc-seg--cluster": props.count > 1,
                "sbc-seg--dimmed": props.dimmed,
                "sbc-seg--highlight": props.highlighted,
                "sbc-seg--dragging": props.dragging,
                "sbc-seg--enter": props.entering
            })}
            style={style}
            data-el={props.elementKey}
            role={props.interactive ? "button" : "img"}
            tabIndex={props.interactive ? (props.tabbable ? 0 : -1) : undefined}
            aria-label={props.ariaLabel}
        >
            {props.showLabel && props.height >= 1 ? (
                <span className="sbc-seg-label" style={{ color: props.labelColor }}>
                    {props.count > 1 ? `${props.count} items` : props.label}
                </span>
            ) : null}
        </div>
    );
}

export const Segment = memo(SegmentComponent);
