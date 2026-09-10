/**
 * This file was generated from StackedBarChart.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
import {
    ActionValue,
    DynamicValue,
    ListActionValue,
    ListAttributeValue,
    ListExpressionValue,
    ListValue,
    Option,
    WebIcon
} from "mendix";
import { Big } from "big.js";
import { CSSProperties } from "react";

export type ColorModeEnum = "expression" | "attribute" | "palette";

export type PaletteEnum = "vivid" | "pastel" | "cool" | "warm" | "custom";

export type SortSourceEnum = "color" | "attribute";

export type SortDirectionEnum = "asc" | "desc";

export interface SortKeysType {
    sortSource: SortSourceEnum;
    sortAttribute?: ListAttributeValue<string | boolean | Big | Date>;
    sortDirection: SortDirectionEnum;
}

export type ColorOrderModeEnum = "appearance" | "value" | "custom";

export type BarSortModeEnum = "datasource" | "key" | "label" | "total" | "count";

export type BarSortDirectionEnum = "asc" | "desc";

export type HeightModeEnum = "fixed" | "ratio" | "parent";

export type StackModeEnum = "absolute" | "percentage";

export type ShowElementLabelsEnum = "never" | "whenfits";

export type TooltipModeEnum = "none" | "fields";

export interface TooltipFieldsType {
    fieldCaption: string;
    fieldValue: ListExpressionValue<string>;
    fieldVisible?: ListExpressionValue<boolean>;
}

export type ItemStyleEnum = "default" | "primary" | "destructive";

export interface MenuItemsType {
    itemCaption: ListExpressionValue<string>;
    itemIcon?: DynamicValue<WebIcon>;
    itemAction?: ListActionValue;
    itemVisible?: ListExpressionValue<boolean>;
    itemStyle: ItemStyleEnum;
}

export type ShowAddButtonEnum = "always" | "hover" | "never";

export type AddModeEnum = "single" | "menu";

export interface AddMenuItemsType {
    addItemCaption: string;
    addItemIcon?: DynamicValue<WebIcon>;
    addItemAction?: ActionValue<{
        barKey: Option<string>;
        barIndex: Option<Big>;
        insertIndex: Option<Big>;
        barTotal: Option<Big>;
    }>;
}

export type ConfirmationModeEnum = "none" | "dialog" | "action";

export interface SortKeysPreviewType {
    sortSource: SortSourceEnum;
    sortAttribute: string;
    sortDirection: SortDirectionEnum;
}

export interface TooltipFieldsPreviewType {
    fieldCaption: string;
    fieldValue: string;
    fieldVisible: string;
}

export interface MenuItemsPreviewType {
    itemCaption: string;
    itemIcon:
        | { type: "glyph"; iconClass: string }
        | { type: "image"; imageUrl: string; iconUrl: string }
        | { type: "icon"; iconClass: string }
        | undefined;
    itemAction: {} | null;
    itemVisible: string;
    itemStyle: ItemStyleEnum;
}

export interface AddMenuItemsPreviewType {
    addItemCaption: string;
    addItemIcon:
        | { type: "glyph"; iconClass: string }
        | { type: "image"; imageUrl: string; iconUrl: string }
        | { type: "icon"; iconClass: string }
        | undefined;
    addItemAction: {} | null;
}

export interface StackedBarChartContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    datasource: ListValue;
    barKeyAttribute: ListAttributeValue<string | Big | Date | boolean>;
    valueAttribute: ListAttributeValue<Big>;
    labelTemplate?: ListExpressionValue<string>;
    identityAttribute?: ListAttributeValue<string | Big>;
    maxItems: number;
    barsDatasource?: ListValue;
    barsKeyAttribute?: ListAttributeValue<string | Big | Date | boolean>;
    barsLabelTemplate?: ListExpressionValue<string>;
    showEmptyBars: boolean;
    colorMode: ColorModeEnum;
    colorExpression?: ListExpressionValue<string>;
    colorAttribute?: ListAttributeValue<string>;
    seriesAttribute?: ListAttributeValue<string | boolean | Big>;
    palette: PaletteEnum;
    customPalette: string;
    sortKeys: SortKeysType[];
    colorOrderMode: ColorOrderModeEnum;
    colorOrderList: string;
    barSortMode: BarSortModeEnum;
    barSortDirection: BarSortDirectionEnum;
    heightMode: HeightModeEnum;
    heightValue: number;
    barWidth: number;
    barGap: number;
    segmentGap: number;
    cornerRadius: number;
    stackMode: StackModeEnum;
    showValueAxis: boolean;
    valueAxisTitle: string;
    showGridLines: boolean;
    showCategoryAxis: boolean;
    showBarTotals: boolean;
    showElementLabels: ShowElementLabelsEnum;
    showLegend: boolean;
    emptyMessage: string;
    tooltipMode: TooltipModeEnum;
    tooltipTitleTemplate?: ListExpressionValue<string>;
    tooltipShowValue: boolean;
    tooltipShowPercentage: boolean;
    tooltipFields: TooltipFieldsType[];
    tooltipShowDelay: number;
    tooltipHideDelay: number;
    enableElementMenu: boolean;
    menuTitleTemplate?: ListExpressionValue<string>;
    menuItems: MenuItemsType[];
    showAddButton: ShowAddButtonEnum;
    addButtonTooltip: string;
    addMode: AddModeEnum;
    onAddElement?: ActionValue<{
        barKey: Option<string>;
        barIndex: Option<Big>;
        insertIndex: Option<Big>;
        barTotal: Option<Big>;
    }>;
    onBarAdd?: ListActionValue;
    addMenuItems: AddMenuItemsType[];
    enableDragDrop: boolean;
    allowReorderWithinBar: boolean;
    allowMoveAcrossBars: boolean;
    draggableExpression?: ListExpressionValue<boolean>;
    acceptsDropExpression?: ListExpressionValue<boolean>;
    sequenceAttribute?: ListAttributeValue<Big>;
    onDrop?: ListActionValue<{
        sourceBarKey: Option<string>;
        targetBarKey: Option<string>;
        sourceIndex: Option<Big>;
        targetIndex: Option<Big>;
        previousElementGuid: Option<string>;
        nextElementGuid: Option<string>;
    }>;
    dropCommitTimeout: number;
    confirmationMode: ConfirmationModeEnum;
    confirmTitle?: ListExpressionValue<string>;
    confirmMessage?: ListExpressionValue<string>;
    confirmOkCaption: string;
    confirmCancelCaption: string;
    onDropConfirmRequest?: ListActionValue<{
        sourceBarKey: Option<string>;
        targetBarKey: Option<string>;
        sourceIndex: Option<Big>;
        targetIndex: Option<Big>;
        previousElementGuid: Option<string>;
        nextElementGuid: Option<string>;
    }>;
    enableAnimations: boolean;
    animationDuration: number;
    animationDisableThreshold: number;
    virtualizationOverscan: number;
    sliverClustering: boolean;
    sliverThreshold: number;
}

export interface StackedBarChartPreviewProps {
    /**
     * @deprecated Deprecated since version 9.18.0. Please use class property instead.
     */
    className: string;
    class: string;
    style: string;
    styleObject?: CSSProperties;
    readOnly: boolean;
    renderMode: "design" | "xray" | "structure";
    translate: (text: string) => string;
    datasource: {} | { caption: string } | { type: string } | null;
    barKeyAttribute: string;
    valueAttribute: string;
    labelTemplate: string;
    identityAttribute: string;
    maxItems: number | null;
    barsDatasource: {} | { caption: string } | { type: string } | null;
    barsKeyAttribute: string;
    barsLabelTemplate: string;
    showEmptyBars: boolean;
    colorMode: ColorModeEnum;
    colorExpression: string;
    colorAttribute: string;
    seriesAttribute: string;
    palette: PaletteEnum;
    customPalette: string;
    sortKeys: SortKeysPreviewType[];
    colorOrderMode: ColorOrderModeEnum;
    colorOrderList: string;
    barSortMode: BarSortModeEnum;
    barSortDirection: BarSortDirectionEnum;
    heightMode: HeightModeEnum;
    heightValue: number | null;
    barWidth: number | null;
    barGap: number | null;
    segmentGap: number | null;
    cornerRadius: number | null;
    stackMode: StackModeEnum;
    showValueAxis: boolean;
    valueAxisTitle: string;
    showGridLines: boolean;
    showCategoryAxis: boolean;
    showBarTotals: boolean;
    showElementLabels: ShowElementLabelsEnum;
    showLegend: boolean;
    emptyMessage: string;
    tooltipMode: TooltipModeEnum;
    tooltipTitleTemplate: string;
    tooltipShowValue: boolean;
    tooltipShowPercentage: boolean;
    tooltipFields: TooltipFieldsPreviewType[];
    tooltipShowDelay: number | null;
    tooltipHideDelay: number | null;
    enableElementMenu: boolean;
    menuTitleTemplate: string;
    menuItems: MenuItemsPreviewType[];
    showAddButton: ShowAddButtonEnum;
    addButtonTooltip: string;
    addMode: AddModeEnum;
    onAddElement: {} | null;
    onBarAdd: {} | null;
    addMenuItems: AddMenuItemsPreviewType[];
    enableDragDrop: boolean;
    allowReorderWithinBar: boolean;
    allowMoveAcrossBars: boolean;
    draggableExpression: string;
    acceptsDropExpression: string;
    sequenceAttribute: string;
    onDrop: {} | null;
    dropCommitTimeout: number | null;
    confirmationMode: ConfirmationModeEnum;
    confirmTitle: string;
    confirmMessage: string;
    confirmOkCaption: string;
    confirmCancelCaption: string;
    onDropConfirmRequest: {} | null;
    enableAnimations: boolean;
    animationDuration: number | null;
    animationDisableThreshold: number | null;
    virtualizationOverscan: number | null;
    sliverClustering: boolean;
    sliverThreshold: number | null;
}
