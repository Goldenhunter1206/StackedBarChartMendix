/**
 * Jest-free Mendix value builders for the dev harness.
 * Mirrors src/utils/testing/mendixMocks.ts, which cannot be reused here
 * because it depends on jest.fn().
 */
import Big from "big.js";
import {
    ActionValue,
    DynamicValue,
    ListActionValue,
    ListAttributeValue,
    ListExpressionValue,
    ListValue,
    ObjectItem
} from "mendix";

const AVAILABLE = "available" as const;

export function objectItems(count: number, prefix = "o"): ObjectItem[] {
    return Array.from({ length: count }, (_, index) => ({ id: `${prefix}${index}` }) as ObjectItem);
}

export function listValue(items: ObjectItem[], overrides: Record<string, unknown> = {}): ListValue {
    return {
        status: AVAILABLE,
        items,
        offset: 0,
        limit: Number.POSITIVE_INFINITY,
        sortOrder: [],
        filter: undefined,
        hasMoreItems: false,
        totalCount: items.length,
        setOffset: () => undefined,
        setLimit: () => undefined,
        setSortOrder: () => undefined,
        setFilter: () => undefined,
        requestTotalCount: () => undefined,
        reload: () => undefined,
        ...overrides
    } as unknown as ListValue;
}

export function listAttribute<T>(
    read: (item: ObjectItem) => T | undefined,
    options: { type?: string; universe?: T[] } = {}
): ListAttributeValue<never> {
    const cache = new Map<string, unknown>();
    return {
        id: `attr-${Math.random().toString(36).slice(2)}`,
        type: options.type ?? "String",
        sortable: true,
        filterable: true,
        universe: options.universe,
        isList: false,
        formatter: { format: (value: T) => String(value ?? "") },
        get(item: ObjectItem) {
            let editable = cache.get(item.id);
            if (!editable) {
                const value = read(item);
                editable = {
                    status: AVAILABLE,
                    value,
                    displayValue: String(value ?? ""),
                    readOnly: false,
                    isList: false,
                    setValue: () => undefined,
                    setTextValue: () => undefined,
                    setValidator: () => undefined,
                    setFormatter: () => undefined,
                    universe: options.universe
                };
                cache.set(item.id, editable);
            }
            return editable;
        }
    } as unknown as ListAttributeValue<never>;
}

export function listExpression<T>(read: (item: ObjectItem) => T): ListExpressionValue<never> {
    const cache = new Map<string, DynamicValue<T>>();
    return {
        get(item: ObjectItem) {
            let value = cache.get(item.id);
            if (!value) {
                value = { status: AVAILABLE, value: read(item) } as DynamicValue<T>;
                cache.set(item.id, value);
            }
            return value;
        }
    } as unknown as ListExpressionValue<never>;
}

export function actionValue(onExecute: (args?: unknown) => void): ActionValue {
    return { canExecute: true, isExecuting: false, execute: onExecute } as unknown as ActionValue;
}

export function listAction(onExecute: (item: ObjectItem, args?: unknown) => void): ListActionValue<never> {
    return {
        get: (item: ObjectItem) => ({
            canExecute: true,
            isExecuting: false,
            execute: (args?: unknown) => onExecute(item, args)
        })
    } as unknown as ListActionValue<never>;
}

export function big(value: number | string): Big {
    return new Big(value);
}
