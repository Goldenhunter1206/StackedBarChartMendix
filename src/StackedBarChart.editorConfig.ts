import { StackedBarChartPreviewProps } from "../typings/StackedBarChartProps";
import { hideNestedProperties, hideProperties, Problem, Properties } from "./utils/editorTypes";

/*
 * Note on data source properties.
 *
 * Studio Pro hands `check` and `getProperties` the same descriptor for every
 * data source property on the widget, configured or not — an unset
 * `barsDatasource` arrives carrying the caption of the elements data source.
 * There is therefore no way to tell from here whether a bars data source has
 * been selected, so nothing below branches on one: the bars properties are
 * always offered, and their descriptions say when they apply.
 */

/**
 * Trims the Studio Pro property grid to what the current configuration
 * actually uses. The widget exposes a lot of properties; showing all of them
 * at once makes the useful ones hard to find.
 */
export function getProperties(values: StackedBarChartPreviewProps, defaultProperties: Properties): Properties {
    const hidden: string[] = [];

    if (values.colorMode !== "expression") {
        hidden.push("colorExpression");
    }
    if (values.colorMode !== "attribute") {
        hidden.push("colorAttribute");
    }
    if (values.palette !== "custom") {
        hidden.push("customPalette");
    }
    if (values.colorOrderMode !== "custom") {
        hidden.push("colorOrderList");
    }

    if (values.heightMode === "parent") {
        hidden.push("heightValue");
    }

    if (values.tooltipMode === "none") {
        hidden.push(
            "tooltipTitleTemplate",
            "tooltipShowValue",
            "tooltipShowPercentage",
            "tooltipFields",
            "tooltipShowDelay",
            "tooltipHideDelay"
        );
    }

    if (!values.enableElementMenu) {
        hidden.push("menuTitleTemplate", "menuItems");
    }

    if (values.showAddButton === "never") {
        hidden.push("addButtonTooltip", "addMode", "onAddElement", "onBarAdd", "addMenuItems");
    } else if (values.addMode === "menu") {
        hidden.push("onAddElement", "onBarAdd");
    } else {
        hidden.push("addMenuItems");
    }

    if (!values.enableDragDrop) {
        hidden.push("acceptsDropExpression");
    }

    if (!values.enableDragDrop) {
        hidden.push(
            "allowReorderWithinBar",
            "allowMoveAcrossBars",
            "draggableExpression",
            "acceptsDropExpression",
            "sequenceAttribute",
            "onDrop",
            "dropCommitTimeout",
            "confirmationMode",
            "confirmTitle",
            "confirmMessage",
            "confirmOkCaption",
            "confirmCancelCaption",
            "onDropConfirmRequest"
        );
    } else {
        if (values.confirmationMode !== "dialog") {
            hidden.push("confirmTitle", "confirmMessage", "confirmOkCaption", "confirmCancelCaption");
        }
        if (values.confirmationMode !== "action") {
            hidden.push("onDropConfirmRequest");
        }
    }

    if (!values.sliverClustering) {
        hidden.push("sliverThreshold");
    }
    if (!values.enableAnimations) {
        hidden.push("animationDuration", "animationDisableThreshold");
    }

    hideProperties(defaultProperties, hidden);

    // A sort key that ranks colours has no attribute to choose.
    values.sortKeys.forEach((key, index) => {
        if (key.sortSource === "color") {
            hideNestedProperties(defaultProperties, "sortKeys", index, ["sortAttribute"]);
        }
    });

    return defaultProperties;
}

/**
 * Configuration mistakes that Studio Pro can catch before the app is run.
 *
 * The warnings matter as much as the errors here: several combinations are
 * perfectly valid XML but produce a chart that quietly does not do what the
 * modeller expects — most notably a drag that cannot stick because the sort
 * order, not the drop position, decides where an element sits.
 */
export function check(values: StackedBarChartPreviewProps): Problem[] {
    const problems: Problem[] = [];

    if (values.colorMode === "expression" && !values.colorExpression) {
        problems.push({
            property: "colorExpression",
            severity: "error",
            message: "Set a colour expression, or choose a different colour source."
        });
    }
    if (values.colorMode === "attribute" && !values.colorAttribute) {
        problems.push({
            property: "colorAttribute",
            severity: "error",
            message: "Set a colour attribute, or choose a different colour source."
        });
    }
    if (values.colorMode === "palette" && !values.seriesAttribute) {
        problems.push({
            property: "seriesAttribute",
            severity: "error",
            message: "Automatic palette colouring needs a series attribute to group elements by."
        });
    }

    if (values.enableElementMenu && values.menuItems.length === 0) {
        problems.push({
            property: "menuItems",
            severity: "warning",
            message: "The element menu is enabled but has no items, so clicking an element will do nothing."
        });
    }

    if (values.showAddButton !== "never") {
        if (values.addMode === "menu" && values.addMenuItems.length === 0) {
            problems.push({
                property: "addMenuItems",
                severity: "warning",
                message: "The add button opens a menu but no menu items are configured."
            });
        }
        if (values.addMode === "single" && !values.onAddElement && !values.onBarAdd) {
            problems.push({
                property: "onAddElement",
                severity: "warning",
                message: "The add button is shown but no add action is configured, so it will do nothing."
            });
        }
    }

    if (values.enableDragDrop) {
        if (!values.onDrop && !values.sequenceAttribute) {
            problems.push({
                property: "onDrop",
                severity: "warning",
                message:
                    "Drag and drop is enabled but nothing persists the move. Set an on drop action, a sequence attribute, or both — otherwise elements snap back as soon as the data refreshes."
            });
        }

        // The order inside a bar comes from the sort keys. If the sequence
        // attribute is not one of them, a reorder is discarded the moment the
        // data reloads, which looks like the widget losing the change.
        const sortsBySequence =
            values.sequenceAttribute !== "" &&
            values.sortKeys.some(
                key => key.sortSource === "attribute" && key.sortAttribute === values.sequenceAttribute
            );

        if (values.allowReorderWithinBar && values.sequenceAttribute && !sortsBySequence) {
            problems.push({
                property: "sortKeys",
                severity: "warning",
                message:
                    "Add the sequence attribute as a sort key. Element order inside a bar comes from the sort keys, so without it a reorder will not survive a refresh."
            });
        }

        if (values.allowReorderWithinBar && !values.sequenceAttribute && values.sortKeys.length > 0) {
            problems.push({
                property: "sequenceAttribute",
                severity: "warning",
                message:
                    "Reordering within a bar has no effect while the order is decided by sort keys. Set a sequence attribute and sort by it, or turn reordering off."
            });
        }
    }

    values.sortKeys.forEach((key, index) => {
        if (key.sortSource === "attribute" && !key.sortAttribute) {
            problems.push({
                property: "sortKeys",
                severity: "warning",
                message: `Sort key ${index + 1} sorts by an attribute but none is selected; it will be ignored.`
            });
        }
    });

    if (values.maxItems !== null && values.maxItems < 0) {
        problems.push({
            property: "maxItems",
            severity: "error",
            message: "Maximum elements cannot be negative. Use 0 for no limit."
        });
    }

    return problems;
}
