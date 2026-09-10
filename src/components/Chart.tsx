import { CSSProperties, ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import classNames from "classnames";
import { ValueStatus } from "mendix";

import { StackedBarChartContainerProps } from "../../typings/StackedBarChartProps";
import { useChartModel } from "../hooks/useChartModel";
import { useElementSize } from "../hooks/useElementSize";
import { useLazyText } from "../hooks/useLazyText";
import { useVirtualBars } from "../hooks/useVirtualBars";
import { layoutChart, LayoutOptions } from "../model/layout";
import { ChartElement } from "../model/types";
import { CAPTION_HEIGHT, HEADROOM, MIN_PLOT_HEIGHT } from "../ui/constants";
import { Bar } from "./Bar";
import { EmptyState, LoadingSkeleton } from "./EmptyState";
import { GridLines } from "./GridLines";
import { Legend } from "./Legend";
import { ValueAxis } from "./ValueAxis";

export function Chart(props: StackedBarChartContainerProps): ReactElement {
    const rootRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const rootSize = useElementSize(rootRef);
    const viewport = useElementSize(scrollRef);

    const model = useChartModel(props);
    const labelOf = useLazyText(props.labelTemplate, model);

    const [activeColorKey, setActiveColorKey] = useState<string | null>(null);

    useDataSourceLimit(props);

    const captionHeight = props.showCategoryAxis ? CAPTION_HEIGHT : 0;
    const chartHeight = resolveChartHeight(props, rootSize.width, rootSize.height);
    const plotHeight = Math.max(MIN_PLOT_HEIGHT, chartHeight - HEADROOM - captionHeight);

    const layoutOptions: LayoutOptions = useMemo(
        () => ({
            plotHeight,
            barWidth: Math.max(4, props.barWidth),
            barGap: Math.max(0, props.barGap),
            segmentGap: Math.max(0, props.segmentGap),
            stackMode: props.stackMode,
            sliverThreshold: Math.max(0, props.sliverThreshold),
            sliverClustering: props.sliverClustering
        }),
        [
            plotHeight,
            props.barWidth,
            props.barGap,
            props.segmentGap,
            props.stackMode,
            props.sliverThreshold,
            props.sliverClustering
        ]
    );

    const layout = useMemo(() => layoutChart(model, layoutOptions), [model, layoutOptions]);

    const pitch = layoutOptions.barWidth + layoutOptions.barGap;
    const range = useVirtualBars(
        scrollRef,
        layout.bars.length,
        pitch,
        viewport.width,
        Math.max(0, props.virtualizationOverscan)
    );

    const valueText = useMemo(() => {
        const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
        return (value: number) => formatter.format(value);
    }, []);

    // Animation is a nicety; above a certain number of mounted nodes it becomes
    // the reason the chart feels slow, so it turns itself off.
    const mountedNodes = countMountedNodes(layout, range.start, range.end);
    const animate = props.enableAnimations && mountedNodes <= Math.max(0, props.animationDisableThreshold);

    const dimmedColors = useMemo(
        () => (activeColorKey === null ? null : new Set([activeColorKey])),
        [activeColorKey]
    );

    const onLegendHover = useCallback((colorKey: string | null) => setActiveColorKey(colorKey), []);

    const rootStyle: CSSProperties = {
        ...props.style,
        ["--sbc-headroom" as string]: `${HEADROOM}px`,
        ["--sbc-plot-height" as string]: `${plotHeight}px`,
        ["--sbc-caption-height" as string]: `${captionHeight}px`,
        ["--sbc-bar-width" as string]: `${layoutOptions.barWidth}px`,
        ["--sbc-duration" as string]: `${Math.max(0, props.animationDuration)}ms`
    };

    if (props.datasource.status === ValueStatus.Loading && model.bars.length === 0) {
        return (
            <div ref={rootRef} className={classNames("sbc", props.class)} style={rootStyle}>
                <LoadingSkeleton />
            </div>
        );
    }

    if (model.bars.length === 0) {
        return (
            <div ref={rootRef} className={classNames("sbc", props.class)} style={rootStyle}>
                <EmptyState message={props.emptyMessage} />
            </div>
        );
    }

    const visibleBars = layout.bars.slice(range.start, range.end);

    return (
        <div
            ref={rootRef}
            className={classNames("sbc", props.class, { "sbc--no-motion": !animate })}
            style={rootStyle}
            role="figure"
            aria-label={ariaSummary(model.bars.length, model.elementCount)}
        >
            {model.truncated ? (
                <p className="sbc-notice" role="status">
                    Showing {model.elementCount}
                    {model.totalCount !== undefined ? ` of ${model.totalCount}` : ""} elements. Raise the maximum
                    elements setting or filter the data source to see the rest.
                </p>
            ) : null}

            {props.showLegend ? (
                <Legend entries={model.legend} activeColorKey={activeColorKey} onHover={onLegendHover} />
            ) : null}

            <div className="sbc-frame" style={{ height: `${HEADROOM + plotHeight + captionHeight}px` }}>
                {props.showValueAxis ? (
                    <ValueAxis
                        ticks={layout.ticks}
                        axisMax={layout.axisMax}
                        plotHeight={plotHeight}
                        captionHeight={captionHeight}
                        title={props.valueAxisTitle}
                        percentage={props.stackMode === "percentage"}
                    />
                ) : null}

                <div className="sbc-scroll" ref={scrollRef}>
                    <div className="sbc-canvas" style={{ width: `${layout.contentWidth}px`, height: "100%" }}>
                        {props.showGridLines ? (
                            <GridLines ticks={layout.ticks} axisMax={layout.axisMax} plotHeight={plotHeight} />
                        ) : null}

                        {visibleBars.map(bar => (
                            <Bar
                                key={bar.bar.key}
                                layout={bar}
                                radius={Math.max(0, props.cornerRadius)}
                                showLabels={props.showElementLabels === "whenfits"}
                                showTotal={props.showBarTotals}
                                showCaption={props.showCategoryAxis}
                                totalText={
                                    props.stackMode === "percentage" ? "100%" : valueText(bar.bar.total)
                                }
                                interactive={props.enableElementMenu && props.menuItems.length > 0}
                                addButton={props.showAddButton}
                                addEnabled
                                addTooltip={props.addButtonTooltip}
                                tabbableKey={null}
                                dimmedColors={dimmedColors}
                                draggingKey={null}
                                labelOf={labelOf}
                                valueText={valueText}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Applies the configured cap to the data source.
 *
 * Guarded against re-setting a limit that is already in place: Mendix reacts to
 * `setLimit` by producing new props, so an unguarded call in an effect is a
 * refetch loop that will hammer the server.
 */
function useDataSourceLimit(props: StackedBarChartContainerProps): void {
    const { datasource, maxItems } = props;

    useEffect(() => {
        const desired = maxItems > 0 ? maxItems : Number.POSITIVE_INFINITY;
        if (datasource.limit !== desired) {
            datasource.setLimit(Number.isFinite(desired) ? desired : undefined);
        }
        if (maxItems > 0) {
            // Only worth the server cost when the data can actually be capped,
            // and it is what turns "truncated" into "showing X of Y".
            datasource.requestTotalCount(true);
        }
    }, [datasource, maxItems]);
}

function resolveChartHeight(props: StackedBarChartContainerProps, width: number, height: number): number {
    switch (props.heightMode) {
        case "ratio":
            return Math.max(MIN_PLOT_HEIGHT, (width * Math.max(1, props.heightValue)) / 100);
        case "parent":
            return height > 0 ? height : props.heightValue;
        case "fixed":
        default:
            return Math.max(MIN_PLOT_HEIGHT, props.heightValue);
    }
}

function countMountedNodes(layout: ReturnType<typeof layoutChart>, start: number, end: number): number {
    let count = 0;
    for (let i = start; i < end && i < layout.bars.length; i++) {
        count += layout.bars[i].nodes.length;
    }
    return count;
}

function ariaSummary(barCount: number, elementCount: number): string {
    return `Stacked bar chart with ${barCount} bars and ${elementCount} elements`;
}

export type { ChartElement };
