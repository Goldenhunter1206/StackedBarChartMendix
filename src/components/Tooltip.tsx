import { ReactElement } from "react";
import { ValueStatus } from "mendix";

import { StackedBarChartContainerProps } from "../../typings/StackedBarChartProps";
import { ElementTarget } from "../hooks/useChartInteractions";
import { readFlag, readText } from "../hooks/useLazyText";
import { Popover } from "./Popover";

export type TooltipConfig = Pick<
    StackedBarChartContainerProps,
    | "tooltipTitleTemplate"
    | "tooltipShowValue"
    | "tooltipShowPercentage"
    | "tooltipFields"
    | "labelTemplate"
    | "valueAttribute"
    | "stackMode"
>;

export interface TooltipProps {
    target: ElementTarget;
    config: TooltipConfig;
}

/**
 * Hover card for one element.
 *
 * Every Mendix value it shows is read here, for this element only — which is
 * why configuring five tooltip fields costs nothing until something is actually
 * hovered.
 *
 * It anchors to the element rather than following the pointer: a stacked
 * element can be a couple of pixels tall, and a card that chases the cursor
 * across them reads as jitter.
 */
export function Tooltip({ target, config }: TooltipProps): ReactElement {
    const { element, node, bar } = target;
    const item = element.item;

    const title = readText(config.tooltipTitleTemplate, item) || readText(config.labelTemplate, item) || "Element";

    const share = bar.total > 0 ? (element.value / bar.total) * 100 : 0;
    const fields = config.tooltipFields
        .filter(field => readFlag(field.fieldVisible, item, true))
        .map(field => ({ caption: field.fieldCaption, value: readText(field.fieldValue, item) }))
        .filter(field => field.value !== "");

    return (
        <Popover anchor={target.rect} placement="right" className="sbc-tooltip" role="tooltip">
            <div className="sbc-tooltip-head">
                <span className="sbc-tooltip-swatch" style={{ background: node.color }} aria-hidden="true" />
                <span className="sbc-tooltip-title">{node.count > 1 ? `${node.count} small elements` : title}</span>
            </div>

            {config.tooltipShowValue || config.tooltipShowPercentage ? (
                <div className="sbc-tooltip-value">
                    {config.tooltipShowValue ? <strong>{displayValue(config, target)}</strong> : null}
                    {config.tooltipShowPercentage ? (
                        <span className="sbc-tooltip-share">{share.toFixed(share < 10 ? 1 : 0)}% of bar</span>
                    ) : null}
                </div>
            ) : null}

            {fields.length > 0 && node.count === 1 ? (
                <dl className="sbc-tooltip-fields">
                    {fields.map(field => (
                        <div className="sbc-tooltip-field" key={field.caption}>
                            <dt>{field.caption}</dt>
                            <dd>{field.value}</dd>
                        </div>
                    ))}
                </dl>
            ) : null}

            <div className="sbc-tooltip-foot">{bar.label}</div>
        </Popover>
    );
}

/**
 * Prefers the attribute's own Mendix formatter, so the number is rendered with
 * the modeller's configured precision and locale rather than a guess.
 */
function displayValue(config: TooltipConfig, target: ElementTarget): string {
    if (config.stackMode === "percentage") {
        return `${target.element.value}`;
    }
    const editable = config.valueAttribute.get(target.element.item);
    if (editable.status === ValueStatus.Available && editable.displayValue) {
        return editable.displayValue;
    }
    return String(target.element.value);
}
