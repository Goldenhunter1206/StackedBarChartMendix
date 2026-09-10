import { useMemo } from "react";
import { ListExpressionValue, ObjectItem, ValueStatus } from "mendix";

import { ChartElement } from "../model/types";

export type TextResolver = (element: ChartElement) => string;

/**
 * Resolves a Mendix text template for one element at a time, caching the result.
 *
 * Labels are only ever needed for elements that are on screen, hovered or open
 * in a menu, so evaluating the template for the whole data set would be pure
 * waste. The cache is rebuilt whenever the template or the data changes.
 */
export function useLazyText(template: ListExpressionValue<string> | undefined, resetKey: unknown): TextResolver {
    return useMemo(() => {
        const cache = new Map<string, string>();
        return (element: ChartElement) => {
            if (!template) {
                return "";
            }
            let text = cache.get(element.key);
            if (text === undefined) {
                text = readText(template, element.item);
                cache.set(element.key, text);
            }
            return text;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [template, resetKey]);
}

export function readText(template: ListExpressionValue<string> | undefined, item: ObjectItem): string {
    if (!template) {
        return "";
    }
    const value = template.get(item);
    return value.status === ValueStatus.Available ? (value.value ?? "") : "";
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
