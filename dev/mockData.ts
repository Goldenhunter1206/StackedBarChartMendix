import { ObjectItem } from "mendix";

import { StackedBarChartContainerProps } from "../typings/StackedBarChartProps";
import { actionValue, big, listAction, listAttribute, listExpression, listValue, objectItems } from "./mockMendix";

export interface Task {
    day: string;
    name: string;
    hours: number;
    category: "Feature" | "Bug" | "Review" | "Meeting" | "Support";
    priority: number;
    owner: string;
}

const CATEGORY_COLORS: Record<Task["category"], string> = {
    Feature: "#6366f1",
    Bug: "#ef4444",
    Review: "#f59e0b",
    Meeting: "#06b6d4",
    Support: "#22c55e"
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CATEGORIES = Object.keys(CATEGORY_COLORS) as Array<Task["category"]>;
const OWNERS = ["Robin", "Sam", "Kim", "Alex", "Jules"];

/** Deterministic pseudo-random so the harness looks the same on every reload. */
function makeRandom(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

export function generateTasks(barCount: number, perBar: number, seed = 7): Task[] {
    const random = makeRandom(seed);
    const tasks: Task[] = [];
    for (let b = 0; b < barCount; b++) {
        const day = barCount <= DAYS.length ? DAYS[b] : `Day ${b + 1}`;
        const count = Math.max(1, Math.round(perBar * (0.5 + random())));
        for (let i = 0; i < count; i++) {
            const category = CATEGORIES[Math.floor(random() * CATEGORIES.length)];
            tasks.push({
                day,
                name: `${category} task ${i + 1}`,
                hours: Math.round((0.5 + random() * 3.5) * 4) / 4,
                category,
                priority: 1 + Math.floor(random() * 5),
                owner: OWNERS[Math.floor(random() * OWNERS.length)]
            });
        }
    }
    return tasks;
}

export interface MockOptions {
    tasks: Task[];
    overrides?: Partial<StackedBarChartContainerProps>;
    onEvent?: (message: string) => void;
}

export function mockProps({ tasks, overrides = {}, onEvent = () => undefined }: MockOptions): StackedBarChartContainerProps {
    const items = objectItems(tasks.length);
    const index = new Map<string, Task>();
    items.forEach((item, i) => index.set(item.id, tasks[i]));
    const task = (item: ObjectItem): Task => index.get(item.id)!;

    return {
        name: "chart",
        class: "",
        style: undefined,
        tabIndex: undefined,

        datasource: listValue(items),
        barKeyAttribute: listAttribute(item => task(item).day),
        valueAttribute: listAttribute(item => big(task(item).hours), { type: "Decimal" }),
        labelTemplate: listExpression(item => task(item).name),
        identityAttribute: undefined,
        maxItems: 0,

        barsDatasource: undefined,
        barsKeyAttribute: undefined,
        barsLabelTemplate: undefined,
        showEmptyBars: true,

        colorMode: "expression",
        colorExpression: listExpression(item => CATEGORY_COLORS[task(item).category]),
        colorAttribute: undefined,
        seriesAttribute: listAttribute(item => task(item).category),
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
        valueAxisTitle: "Hours",
        showGridLines: true,
        showCategoryAxis: true,
        showBarTotals: true,
        showElementLabels: "whenfits",
        showLegend: true,
        emptyMessage: "No data to display",

        tooltipMode: "fields",
        tooltipTitleTemplate: listExpression(item => task(item).name),
        tooltipShowValue: true,
        tooltipShowPercentage: true,
        tooltipFields: [
            {
                fieldCaption: "Category",
                fieldValue: listExpression(item => task(item).category),
                fieldVisible: undefined
            },
            { fieldCaption: "Owner", fieldValue: listExpression(item => task(item).owner), fieldVisible: undefined },
            {
                fieldCaption: "Priority",
                fieldValue: listExpression(item => `P${task(item).priority}`),
                fieldVisible: undefined
            }
        ],
        tooltipShowDelay: 80,
        tooltipHideDelay: 120,

        enableElementMenu: true,
        menuTitleTemplate: listExpression(item => task(item).name),
        menuItems: [
            {
                itemCaption: listExpression(() => "Edit hours"),
                itemIcon: undefined,
                itemAction: listAction(item => onEvent(`Edit hours -> ${task(item).name}`)),
                itemVisible: undefined,
                itemStyle: "primary"
            },
            {
                itemCaption: listExpression(item => `Reassign from ${task(item).owner}`),
                itemIcon: undefined,
                itemAction: listAction(item => onEvent(`Reassign -> ${task(item).name}`)),
                itemVisible: undefined,
                itemStyle: "default"
            },
            {
                itemCaption: listExpression(() => "Delete"),
                itemIcon: undefined,
                itemAction: listAction(item => onEvent(`Delete -> ${task(item).name}`)),
                itemVisible: undefined,
                itemStyle: "destructive"
            }
        ],

        showAddButton: "hover",
        addButtonTooltip: "Add element",
        addMode: "single",
        onAddElement: actionValue(args => onEvent(`Add -> ${JSON.stringify(args)}`)),
        onBarAdd: undefined,
        addMenuItems: [],

        enableDragDrop: true,
        allowReorderWithinBar: true,
        allowMoveAcrossBars: true,
        draggableExpression: undefined,
        acceptsDropExpression: undefined,
        sequenceAttribute: undefined,
        onDrop: listAction((item, args) => onEvent(`Drop -> ${task(item).name} ${JSON.stringify(args)}`)),
        dropCommitTimeout: 8000,

        confirmationMode: "none",
        confirmTitle: undefined,
        confirmMessage: undefined,
        confirmOkCaption: "Move",
        confirmCancelCaption: "Cancel",
        onDropConfirmRequest: undefined,

        enableAnimations: true,
        animationDuration: 320,
        animationDisableThreshold: 1500,
        virtualizationOverscan: 3,
        sliverClustering: false,
        sliverThreshold: 2,

        ...overrides
    } as StackedBarChartContainerProps;
}

export { CATEGORY_COLORS };
