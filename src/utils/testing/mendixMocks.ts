/**
 * Hand-rolled builders for Mendix client values.
 *
 * Mendix's own `@mendix/widget-plugin-test-utils` is not published to npm, so
 * these stand in for it. Every accessor memoises per item, which lets tests
 * assert how many times the widget touched a Mendix accessor — the regression
 * guard for the whole "extract once per data version" performance design.
 */
import { Big } from "big.js";
import {
    ActionValue,
    DynamicValue,
    ListActionValue,
    ListAttributeValue,
    ListExpressionValue,
    ListValue,
    ObjectItem,
    ValueStatus
} from "mendix";

export interface CountingAccessor {
    /** How many times `.get()` was called across all items. */
    readonly callCount: number;
    resetCallCount(): void;
}

export function objectItems(count: number, prefix = "o"): ObjectItem[] {
    return Array.from({ length: count }, (_, index) => ({ id: `${prefix}${index}` } as ObjectItem));
}

export function dynamic<T>(value: T | undefined, status: ValueStatus = ValueStatus.Available): DynamicValue<T> {
    return { status, value } as DynamicValue<T>;
}

export function listValue(items: ObjectItem[], overrides: Partial<ListValue> = {}): ListValue {
    return {
        status: ValueStatus.Available,
        items,
        offset: 0,
        limit: Number.POSITIVE_INFINITY,
        sortOrder: [],
        filter: undefined,
        hasMoreItems: false,
        totalCount: items.length,
        setOffset: jest.fn(),
        setLimit: jest.fn(),
        setSortOrder: jest.fn(),
        setFilter: jest.fn(),
        requestTotalCount: jest.fn(),
        reload: jest.fn(),
        ...overrides
    } as unknown as ListValue;
}

type MxValue = string | boolean | Date | Big | undefined;

export interface ListAttributeOptions<T> {
    type?: ListAttributeValue["type"];
    universe?: T[];
    sortable?: boolean;
    formatter?: (value: T | undefined) => string;
}

export function listAttribute<T extends MxValue>(
    read: (item: ObjectItem, index: number) => T | undefined,
    options: ListAttributeOptions<T> = {}
): ListAttributeValue<T> & CountingAccessor {
    const cache = new Map<string, unknown>();
    let calls = 0;
    let order = 0;

    const attribute = {
        id: "attr" as never,
        type: options.type ?? "String",
        sortable: options.sortable ?? true,
        filterable: true,
        universe: options.universe,
        isList: false,
        formatter: {
            format: (value: T | undefined) => (options.formatter ? options.formatter(value) : String(value ?? "")),
            parse: () => ({ valid: false })
        },
        get(item: ObjectItem) {
            calls++;
            let editable = cache.get(item.id);
            if (!editable) {
                const value = read(item, order++);
                editable = {
                    status: ValueStatus.Available,
                    value,
                    displayValue: String(value ?? ""),
                    readOnly: false,
                    validation: undefined,
                    isList: false,
                    setValue: jest.fn(),
                    setTextValue: jest.fn(),
                    setValidator: jest.fn(),
                    setFormatter: jest.fn(),
                    formatter: attribute.formatter,
                    universe: options.universe
                };
                cache.set(item.id, editable);
            }
            return editable;
        },
        get callCount() {
            return calls;
        },
        resetCallCount() {
            calls = 0;
        }
    };

    return attribute as unknown as ListAttributeValue<T> & CountingAccessor;
}

export function listExpression<T extends MxValue>(
    read: (item: ObjectItem, index: number) => T | undefined
): ListExpressionValue<T> & CountingAccessor {
    const cache = new Map<string, DynamicValue<T>>();
    let calls = 0;
    let order = 0;

    return {
        get(item: ObjectItem) {
            calls++;
            let value = cache.get(item.id);
            if (!value) {
                value = dynamic(read(item, order++));
                cache.set(item.id, value);
            }
            return value;
        },
        get callCount() {
            return calls;
        },
        resetCallCount() {
            calls = 0;
        }
    } as unknown as ListExpressionValue<T> & CountingAccessor;
}

export interface ActionSpy<TArgs = unknown> {
    execute: jest.Mock<void, [TArgs?]>;
    canExecute: boolean;
    isExecuting: boolean;
}

export function actionValue<TArgs = unknown>(
    overrides: Partial<ActionSpy<TArgs>> = {}
): ActionValue & ActionSpy<TArgs> {
    return {
        canExecute: true,
        isExecuting: false,
        execute: jest.fn(),
        ...overrides
    } as unknown as ActionValue & ActionSpy<TArgs>;
}

/** A per-row action whose `.get()` returns one stable ActionValue per item. */
export function listAction<TArgs = unknown>(
    overrides: Partial<ActionSpy<TArgs>> = {}
): ListActionValue<never> & { for(item: ObjectItem): ActionValue & ActionSpy<TArgs> } {
    const cache = new Map<string, ActionValue & ActionSpy<TArgs>>();
    const forItem = (item: ObjectItem): ActionValue & ActionSpy<TArgs> => {
        let action = cache.get(item.id);
        if (!action) {
            action = actionValue<TArgs>(overrides);
            cache.set(item.id, action);
        }
        return action;
    };
    return { get: forItem, for: forItem } as unknown as ListActionValue<never> & {
        for(item: ObjectItem): ActionValue & ActionSpy<TArgs>;
    };
}

/** Convenience for building Big values in tests. */
export function big(value: number | string): Big {
    return new Big(value);
}
