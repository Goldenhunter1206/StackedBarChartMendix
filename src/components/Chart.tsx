import { CSSProperties, ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import classNames from "classnames";
import { ValueStatus } from "mendix";
import Big from "big.js";

import { StackedBarChartContainerProps } from "../../typings/StackedBarChartProps";
import { useChartModel } from "../hooks/useChartModel";
import { useElementSize } from "../hooks/useElementSize";
import { useLazyText } from "../hooks/useLazyText";
import { BarTarget, ElementTarget, useChartInteractions } from "../hooks/useChartInteractions";
import { useDragAndDrop } from "../hooks/useDragAndDrop";
import { useVirtualBars } from "../hooks/useVirtualBars";
import { applyMove, MoveDescription } from "../model/dragModel";
import { dropArguments, writeSequence } from "../model/dropActions";
import { layoutChart, LayoutOptions } from "../model/layout";
import { ChartBar, ChartElement, ChartModel } from "../model/types";
import { CAPTION_HEIGHT, HEADROOM, MIN_PLOT_HEIGHT } from "../ui/constants";
import { Bar } from "./Bar";
import { ConfirmDialog } from "./ConfirmDialog";
import { DragLayer } from "./DragLayer";
import { elementMenuTitle, MenuEntry, MenuPanel, useElementMenuEntries } from "./ElementMenu";
import { EmptyState, LoadingSkeleton } from "./EmptyState";
import { GridLines } from "./GridLines";
import { Legend } from "./Legend";
import { readFlag, readText } from "../hooks/useLazyText";
import { Tooltip } from "./Tooltip";
import { ValueAxis } from "./ValueAxis";

export function Chart(props: StackedBarChartContainerProps): ReactElement {
    const rootRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const rootSize = useElementSize(rootRef);
    const viewport = useElementSize(scrollRef);

    const model = useChartModel(props);
    const labelOf = useLazyText(props.labelTemplate, model);


    const [activeColorKey, setActiveColorKey] = useState<string | null>(null);
    const [menu, setMenu] = useState<OpenMenu | null>(null);
    const [focusedKey, setFocusedKey] = useState<string | null>(null);

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

    // The move the user just made, held locally until the data source confirms
    // it. A Mendix action returns nothing at all, so the only honest signals
    // are "the data changed" and "we waited long enough".
    const [pending, setPending] = useState<MoveDescription | null>(null);
    const pendingBaseline = useRef<ChartModel | null>(null);
    const [confirming, setConfirming] = useState<MoveDescription | null>(null);

    useEffect(() => {
        if (pendingBaseline.current !== null && pendingBaseline.current !== model) {
            // New data arrived: either it carries the move, in which case the
            // optimistic copy is redundant, or it does not, in which case the
            // element snaps back. Both are handled by dropping the overlay.
            pendingBaseline.current = null;
            setPending(null);
        }
    }, [model]);

    useEffect(() => {
        if (!pending) {
            return;
        }
        const timer = window.setTimeout(() => {
            pendingBaseline.current = null;
            setPending(null);
        }, Math.max(1000, props.dropCommitTimeout));
        return () => window.clearTimeout(timer);
    }, [pending, props.dropCommitTimeout]);

    const optimisticModel = useMemo(() => (pending ? applyMove(model, pending) : model), [model, pending]);

    const commitMove = useCallback(
        (move: MoveDescription) => {
            pendingBaseline.current = model;
            setPending(move);
            writeSequence(props.sequenceAttribute, model, move);
            const action = props.onDrop?.get(move.element.item);
            if (action?.canExecute) {
                action.execute(dropArguments(move));
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [model, props.sequenceAttribute, props.onDrop]
    );

    const requestMove = useCallback(
        (move: MoveDescription) => {
            if (props.confirmationMode === "dialog") {
                setConfirming(move);
                return;
            }
            if (props.confirmationMode === "action" && props.onDropConfirmRequest) {
                // The confirmation page owns the outcome from here; stay
                // optimistic until the data source says otherwise.
                pendingBaseline.current = model;
                setPending(move);
                const action = props.onDropConfirmRequest.get(move.element.item);
                if (action.canExecute) {
                    action.execute(dropArguments(move));
                }
                return;
            }
            commitMove(move);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [commitMove, model, props.confirmationMode, props.onDropConfirmRequest]
    );

    const baseLayout = useMemo(
        () => layoutChart(optimisticModel, layoutOptions),
        [optimisticModel, layoutOptions]
    );

    const canDragElement = useCallback(
        (element: ChartElement) => readFlag(props.draggableExpression, element.item, true),
        [props.draggableExpression]
    );

    const canDropOnBar = useCallback(
        (barKey: string) => {
            const bar = optimisticModel.bars.find(candidate => candidate.key === barKey);
            return bar?.item ? readFlag(props.acceptsDropExpression, bar.item, true) : true;
        },
        [optimisticModel, props.acceptsDropExpression]
    );

    const { drag, previewModel } = useDragAndDrop({
        scrollRef,
        model: optimisticModel,
        layout: baseLayout,
        layoutOptions,
        enabled: props.enableDragDrop && confirming === null,
        allowReorderWithinBar: props.allowReorderWithinBar,
        allowMoveAcrossBars: props.allowMoveAcrossBars,
        canDrag: canDragElement,
        canDrop: canDropOnBar,
        onDrop: requestMove
    });

    // While dragging, lay out the model as it would look after the drop, so the
    // target slot opens up under the cursor.
    const layout = useMemo(
        () => (previewModel ? layoutChart(previewModel, layoutOptions) : baseLayout),
        [previewModel, baseLayout, layoutOptions]
    );

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

    const openElement = useCallback((target: ElementTarget) => {
        setFocusedKey(target.node.key);
        setMenu({ kind: "element", target });
    }, []);

    const openAdd = useCallback(
        (target: BarTarget) => {
            if (props.addMode === "menu" && props.addMenuItems.length > 0) {
                setMenu({ kind: "add", target });
                return;
            }
            executeAdd(props, target.bar);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [props.addMode, props.addMenuItems, props.onAddElement, props.onBarAdd]
    );

    const navigate = useCallback(
        (fromKey: string, barDelta: number, elementDelta: number) => {
            const next = neighbourOf(model.bars, fromKey, barDelta, elementDelta);
            if (next) {
                setFocusedKey(next);
            }
        },
        [model.bars]
    );

    const { hover } = useChartInteractions({
        scrollRef,
        layout,
        hoverEnabled: props.tooltipMode !== "none" && menu === null,
        clickEnabled: props.enableElementMenu && props.menuItems.length > 0,
        showDelay: Math.max(0, props.tooltipShowDelay),
        hideDelay: Math.max(0, props.tooltipHideDelay),
        suspended: menu !== null,
        onElementClick: openElement,
        onAddClick: openAdd,
        onNavigate: navigate
    });

    // Keyboard focus drives the scroll position, so arrow keys can walk into
    // bars that virtualization has not mounted yet.
    useFocusFollow(focusedKey, layout, scrollRef, layoutOptions.barWidth + layoutOptions.barGap);

    const closeMenu = useCallback(() => setMenu(null), []);
    const menuItem = menu?.kind === "element" ? menu.target.element.item : undefined;
    const elementEntries = useElementMenuEntries(props, menuItem);

    const dimmedColors = useMemo(
        () => (activeColorKey === null ? null : new Set([activeColorKey])),
        [activeColorKey]
    );

    const onLegendHover = useCallback((colorKey: string | null) => setActiveColorKey(colorKey), []);

    const enteringKeys = useEnteringKeys(optimisticModel, animate);

    // Roving tab index: the chart is a single tab stop, and arrow keys move
    // within it. Without this, a chart with 10,000 elements would be 10,000
    // tab stops.
    const firstVisibleKey = layout.bars[range.start]?.nodes[0]?.key ?? null;
    const tabbableKey = focusedKey ?? firstVisibleKey;

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
            className={classNames("sbc", props.class, {
                "sbc--no-motion": !animate,
                "sbc--draggable": props.enableDragDrop
            })}
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
                                dropTarget={drag?.target?.barKey === bar.bar.key}
                                addTooltip={props.addButtonTooltip}
                                tabbableKey={tabbableKey}
                                dimmedColors={dimmedColors}
                                draggingKey={drag?.elementKey ?? null}
                                enteringKeys={enteringKeys}
                                labelOf={labelOf}
                                valueText={valueText}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {drag ? <DragLayer drag={drag} label={labelOf(drag.element)} /> : null}

            {confirming ? (
                <ConfirmDialog
                    title={readText(props.confirmTitle, confirming.element.item) || "Move element"}
                    message={
                        readText(props.confirmMessage, confirming.element.item) ||
                        `Move this element to ${confirming.targetBarKey}?`
                    }
                    confirmCaption={props.confirmOkCaption || "Move"}
                    cancelCaption={props.confirmCancelCaption || "Cancel"}
                    onConfirm={() => {
                        commitMove(confirming);
                        setConfirming(null);
                    }}
                    onCancel={() => setConfirming(null)}
                />
            ) : null}

            {hover && props.tooltipMode !== "none" && menu === null && drag === null ? (
                <Tooltip target={hover} config={props} />
            ) : null}

            {menu?.kind === "element" ? (
                <MenuPanel
                    anchor={menu.target.rect}
                    title={elementMenuTitle(props, menu.target)}
                    entries={elementEntries}
                    onDismiss={closeMenu}
                />
            ) : null}

            {menu?.kind === "add" ? (
                <MenuPanel
                    anchor={menu.target.rect}
                    title={menu.target.bar.label}
                    entries={addMenuEntries(props, menu.target)}
                    onDismiss={closeMenu}
                />
            ) : null}
        </div>
    );
}

type OpenMenu = { kind: "element"; target: ElementTarget } | { kind: "add"; target: BarTarget };

/**
 * Fires the add action for a bar.
 *
 * With a bars data source the microflow receives the bar object itself. Without
 * one there is no bar object to pass — a bar is a grouping the widget invented —
 * so the context travels as action variables instead.
 */
function executeAdd(props: StackedBarChartContainerProps, bar: ChartBar): void {
    if (props.onBarAdd && bar.item) {
        const action = props.onBarAdd.get(bar.item);
        if (action.canExecute) {
            action.execute();
        }
        return;
    }
    const action = props.onAddElement;
    if (action?.canExecute) {
        action.execute(addArguments(bar));
    }
}

function addArguments(bar: ChartBar): {
    barKey: string;
    barIndex: Big;
    insertIndex: Big;
    barTotal: Big;
} {
    return {
        barKey: bar.key,
        barIndex: new Big(bar.index),
        // New elements are added on top of the bar, so the insert position is
        // the end of the stack.
        insertIndex: new Big(bar.elements.length),
        barTotal: new Big(bar.total)
    };
}

function addMenuEntries(props: StackedBarChartContainerProps, target: BarTarget): MenuEntry[] {
    const args = addArguments(target.bar);
    return props.addMenuItems.map((item, index) => ({
        id: `${index}`,
        caption: item.addItemCaption || `Add ${index + 1}`,
        style: "default" as const,
        icon: item.addItemIcon,
        action: item.addItemAction
            ? {
                  canExecute: item.addItemAction.canExecute,
                  isExecuting: item.addItemAction.isExecuting,
                  execute: () => item.addItemAction?.execute(args)
              }
            : undefined
    }));
}

/** Finds the element key `barDelta` bars and `elementDelta` positions away. */
export function neighbourOf(
    bars: ChartBar[],
    fromKey: string,
    barDelta: number,
    elementDelta: number
): string | null {
    for (let b = 0; b < bars.length; b++) {
        const index = bars[b].elements.findIndex(element => element.key === fromKey);
        if (index === -1) {
            continue;
        }
        if (barDelta !== 0) {
            const targetBar = bars[clampIndex(b + barDelta, bars.length)];
            if (targetBar.elements.length === 0) {
                return null;
            }
            return targetBar.elements[clampIndex(index, targetBar.elements.length)].key;
        }
        return bars[b].elements[clampIndex(index + elementDelta, bars[b].elements.length)].key;
    }
    return null;
}

function clampIndex(value: number, length: number): number {
    return Math.min(length - 1, Math.max(0, value));
}

/**
 * Scrolls a keyboard-focused element into view and then focuses it.
 *
 * The focus call is deferred because the bar may not be mounted yet: arrow keys
 * can walk past the edge of the virtual window, and the node only exists once
 * the scroll has brought it into range.
 */
function useFocusFollow(
    focusedKey: string | null,
    layout: ReturnType<typeof layoutChart>,
    scrollRef: React.RefObject<HTMLElement>,
    pitch: number
): void {
    useEffect(() => {
        if (!focusedKey) {
            return;
        }
        const container = scrollRef.current;
        const barIndex = layout.bars.findIndex(bar => bar.nodes.some(node => node.key === focusedKey));
        if (container && barIndex >= 0) {
            const left = layout.bars[barIndex].x;
            const right = left + layout.bars[barIndex].width;
            if (left < container.scrollLeft) {
                container.scrollLeft = Math.max(0, left - pitch);
            } else if (right > container.scrollLeft + container.clientWidth) {
                container.scrollLeft = right - container.clientWidth + pitch;
            }
        }

        const frame = requestAnimationFrame(() => {
            document.querySelector<HTMLElement>(`[data-el="${cssEscape(focusedKey)}"]`)?.focus();
        });
        return () => cancelAnimationFrame(frame);
    }, [focusedKey, layout, scrollRef, pitch]);
}

function cssEscape(value: string): string {
    return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g, "\\$&");
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

/**
 * Keys that appear in the data for the first time.
 *
 * Comparing against the previous data — rather than against what is mounted —
 * matters: virtualization mounts and unmounts elements constantly while
 * scrolling, and animating those would make every scroll shimmer.
 */
function useEnteringKeys(model: ChartModel, enabled: boolean): Set<string> {
    const previousKeys = useRef<Set<string> | null>(null);

    const entering = useMemo(() => {
        const previous = previousKeys.current;
        const result = new Set<string>();
        if (!enabled) {
            return result;
        }
        for (const bar of model.bars) {
            for (const element of bar.elements) {
                if (!previous || !previous.has(element.key)) {
                    result.add(element.key);
                }
            }
        }
        return result;
    }, [model, enabled]);

    // Written in an effect rather than during render, so a double render in
    // StrictMode does not consume the "new" flag before it is used.
    useEffect(() => {
        const keys = new Set<string>();
        for (const bar of model.bars) {
            for (const element of bar.elements) {
                keys.add(element.key);
            }
        }
        previousKeys.current = keys;
    }, [model]);

    return entering;
}

function ariaSummary(barCount: number, elementCount: number): string {
    return `Stacked bar chart with ${barCount} bars and ${elementCount} elements`;
}

export type { ChartElement };
