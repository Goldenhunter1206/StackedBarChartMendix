import { CSSProperties, memo, ReactElement } from "react";
import classNames from "classnames";

import { ChartElement, LayoutBar } from "../model/types";
import { contrastTextColor } from "../model/color";
import { LABEL_MIN_HEIGHT } from "../ui/constants";
import { Segment } from "./Segment";

export interface BarProps {
    layout: LayoutBar;
    radius: number;
    showLabels: boolean;
    showTotal: boolean;
    showCaption: boolean;
    totalText: string;
    interactive: boolean;
    addButton: "always" | "hover" | "never";
    addEnabled: boolean;
    addTooltip: string;
    /** Key of the one segment in the whole chart that is tab reachable. */
    tabbableKey: string | null;
    /** Colour keys to fade out, used by legend hover. Null means no dimming. */
    dimmedColors: Set<string> | null;
    draggingKey: string | null;
    /** Keys that have just appeared in the data, for the enter animation. */
    enteringKeys: Set<string>;
    /** True while a drag is hovering this bar as its drop target. */
    dropTarget: boolean;
    labelOf: (element: ChartElement) => string;
    valueText: (value: number) => string;
}

/**
 * A single bar: its stack of elements, its total, its caption and its add
 * button. Memoised on a flat prop signature so scrolling and hovering
 * elsewhere in the chart never re-render it.
 */
function BarComponent(props: BarProps): ReactElement {
    const { layout } = props;
    const style: CSSProperties = { left: `${layout.x}px`, width: `${layout.width}px` };

    return (
        <div
            className={classNames("sbc-bar", { "sbc-bar--drop-target": props.dropTarget })}
            style={style}
            data-bar={layout.bar.key}
        >
            <div className="sbc-bar-stack">
                {layout.nodes.map(node => (
                    <Segment
                        key={node.key}
                        elementKey={node.key}
                        y={node.y}
                        height={node.height}
                        color={node.color}
                        radius={props.radius}
                        label={props.labelOf(node.element)}
                        labelColor={contrastTextColor(node.color)}
                        showLabel={props.showLabels && node.height >= LABEL_MIN_HEIGHT}
                        count={node.count}
                        interactive={props.interactive}
                        tabbable={props.tabbableKey === node.key}
                        dimmed={props.dimmedColors !== null && !props.dimmedColors.has(node.element.colorKey)}
                        highlighted={false}
                        dragging={props.draggingKey === node.key}
                        entering={props.enteringKeys.has(node.key)}
                        ariaLabel={ariaLabelFor(props, node.element, node.count)}
                    />
                ))}

                {props.showTotal ? (
                    <span
                        className="sbc-bar-total"
                        style={{ transform: `translate3d(0, ${-(layout.stackHeight + 6)}px, 0)` }}
                    >
                        {props.totalText}
                    </span>
                ) : null}

                {props.addButton !== "never" ? (
                    <button
                        type="button"
                        className={classNames("sbc-add", { "sbc-add--hover": props.addButton === "hover" })}
                        style={{
                            bottom: 0,
                            transform: `translate3d(0, ${-(layout.stackHeight + (props.showTotal ? 24 : 8))}px, 0)`
                        }}
                        data-add={layout.bar.key}
                        title={props.addTooltip}
                        aria-label={`${props.addTooltip}: ${layout.bar.label}`}
                        disabled={!props.addEnabled}
                    >
                        <svg className="sbc-add-glyph" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
                            <path
                                d="M6 1.5v9M1.5 6h9"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                fill="none"
                            />
                        </svg>
                    </button>
                ) : null}
            </div>

            {props.showCaption ? (
                <div className="sbc-bar-caption" title={layout.bar.label}>
                    {layout.bar.label}
                </div>
            ) : null}
        </div>
    );
}

function ariaLabelFor(props: BarProps, element: ChartElement, count: number): string {
    if (count > 1) {
        return `${count} small elements in ${props.layout.bar.label}`;
    }
    const label = props.labelOf(element);
    return `${label || "Element"}, ${props.valueText(element.value)}, in ${props.layout.bar.label}`;
}

export const Bar = memo(BarComponent);
