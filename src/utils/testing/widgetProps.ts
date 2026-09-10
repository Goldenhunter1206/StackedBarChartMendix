import { Big } from "big.js";
import { ObjectItem } from "mendix";

import { StackedBarChartContainerProps } from "../../../typings/StackedBarChartProps";
import { actionValue, big, listAction, listAttribute, listExpression, listValue, objectItems } from "./mendixMocks";

export interface TestRow {
    bar: string;
    label: string;
    value: number;
    color: string;
    priority?: number;
}

/**
 * A fully configured widget, so tests only have to state what they care about.
 * The `items` are exposed on the returned props' data source for tests that
 * need to build a second, refreshed data source over the same objects.
 */
export function widgetProps(
    rows: TestRow[],
    overrides: Partial<StackedBarChartContainerProps> = {}
): StackedBarChartContainerProps {
    const items = objectItems(rows.length);
    const rowOf = (item: ObjectItem): TestRow => rows[items.findIndex(candidate => candidate.id === item.id)];

    return {
        name: "chart",
        class: "",
        style: undefined,
        tabIndex: undefined,

        datasource: listValue(items),
        barKeyAttribute: listAttribute<string>(item => rowOf(item).bar),
        valueAttribute: listAttribute<Big>(item => big(rowOf(item).value), { type: "Decimal" }),
        labelTemplate: listExpression<string>(item => rowOf(item).label),
        identityAttribute: undefined,
        maxItems: 0,

        barsDatasource: undefined,
        barsKeyAttribute: undefined,
        barsLabelTemplate: undefined,
        showEmptyBars: true,

        colorMode: "expression",
        colorExpression: listExpression<string>(item => rowOf(item).color),
        colorAttribute: undefined,
        seriesAttribute: undefined,
        palette: "vivid",
        customPalette: "",

        sortKeys: [],
        colorOrderMode: "appearance",
        colorOrderList: "",
        barSortMode: "datasource",
        barSortDirection: "asc",

        heightMode: "fixed",
        heightValue: 420,
        barWidth: 56,
        barGap: 24,
        segmentGap: 2,
        cornerRadius: 6,

        stackMode: "absolute",
        showValueAxis: true,
        valueAxisTitle: "",
        showGridLines: true,
        showCategoryAxis: true,
        showBarTotals: true,
        showElementLabels: "whenfits",
        showLegend: false,
        emptyMessage: "No data to display",

        tooltipMode: "fields",
        tooltipTitleTemplate: undefined,
        tooltipShowValue: true,
        tooltipShowPercentage: true,
        tooltipFields: [],
        tooltipShowDelay: 0,
        tooltipHideDelay: 0,

        enableElementMenu: true,
        menuTitleTemplate: undefined,
        menuItems: [],
        showAddButton: "always",
        addButtonTooltip: "Add element",
        addMode: "single",
        onAddElement: actionValue(),
        onBarAdd: undefined,
        addMenuItems: [],

        enableDragDrop: false,
        allowReorderWithinBar: true,
        allowMoveAcrossBars: true,
        draggableExpression: undefined,
        acceptsDropExpression: undefined,
        sequenceAttribute: undefined,
        onDrop: listAction(),
        dropCommitTimeout: 8000,

        confirmationMode: "none",
        confirmTitle: undefined,
        confirmMessage: undefined,
        confirmOkCaption: "Move",
        confirmCancelCaption: "Cancel",
        onDropConfirmRequest: undefined,

        enableAnimations: true,
        animationDuration: 0,
        animationDisableThreshold: 100000,
        virtualizationOverscan: 3,
        sliverClustering: false,
        sliverThreshold: 2,

        ...overrides
    } as StackedBarChartContainerProps;
}

/** Rows shaped like a small week of work, for tests that just need data. */
export function sampleRows(): TestRow[] {
    return [
        { bar: "Mon", label: "Alpha", value: 3, color: "#ff0000", priority: 2 },
        { bar: "Tue", label: "Beta", value: 5, color: "#00ff00", priority: 1 },
        { bar: "Mon", label: "Gamma", value: 2, color: "#00ff00", priority: 3 },
        { bar: "Mon", label: "Delta", value: 4, color: "#ff0000", priority: 1 }
    ];
}

export { objectItems, listValue, listAttribute, listExpression, listAction, actionValue, big };
