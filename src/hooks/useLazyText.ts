import { ListExpressionValue, ObjectItem, ValueStatus } from "mendix";

/**
 * Readers for Mendix text templates and boolean expressions.
 *
 * Deliberately plain functions rather than hooks: they are called for one
 * element at a time — the hovered one, the one whose menu is open, the ones
 * currently on screen — which is what keeps a chart with five configured
 * tooltip fields from evaluating five expressions per element in the data.
 */
export function readText(template: ListExpressionValue<string> | undefined, item: ObjectItem): string {
    if (!template) {
        return "";
    }
    const value = template.get(item);
    return value.status === ValueStatus.Available ? value.value ?? "" : "";
}

export function readFlag(
    expression: ListExpressionValue<boolean> | undefined,
    item: ObjectItem,
    fallback: boolean
): boolean {
    if (!expression) {
        return fallback;
    }
    const value = expression.get(item);
    return value.status === ValueStatus.Available ? value.value === true : fallback;
}
