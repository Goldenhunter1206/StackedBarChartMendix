import { ReactElement, useEffect, useMemo, useRef } from "react";
import classNames from "classnames";
import { ActionValue, ObjectItem } from "mendix";

import { StackedBarChartContainerProps } from "../../typings/StackedBarChartProps";
import { ElementTarget } from "../hooks/useChartInteractions";
import { readFlag, readText } from "../hooks/useLazyText";
import { Rect } from "../utils/positioning";
import { MendixIcon } from "./MendixIcon";
import { Popover } from "./Popover";

export interface MenuEntry {
    id: string;
    caption: string;
    style: "default" | "primary" | "destructive";
    icon?: unknown;
    action?: ActionValue;
}

export interface MenuPanelProps {
    anchor: Rect;
    title: string;
    entries: MenuEntry[];
    emptyMessage?: string;
    onDismiss: () => void;
}

/**
 * A keyboard-navigable action menu.
 *
 * Items and their captions are resolved for the open element only, so a menu
 * with a dozen configured items costs nothing until one is opened.
 */
export function MenuPanel({ anchor, title, entries, emptyMessage, onDismiss }: MenuPanelProps): ReactElement {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Move focus into the menu so keyboard users are not left behind on the
        // element that opened it.
        ref.current?.querySelector<HTMLButtonElement>(".sbc-menu-item:not(:disabled)")?.focus();
    }, []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape") {
                event.stopPropagation();
                onDismiss();
                return;
            }
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Tab") {
                return;
            }
            const items = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>(".sbc-menu-item") ?? []).filter(
                item => !item.disabled
            );
            if (items.length === 0) {
                return;
            }
            event.preventDefault();
            const current = items.indexOf(document.activeElement as HTMLButtonElement);
            const forward = event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey);
            const next = current === -1 ? 0 : (current + (forward ? 1 : -1) + items.length) % items.length;
            items[next].focus();
        };

        const onPointerDown = (event: PointerEvent): void => {
            if (!ref.current?.contains(event.target as Node)) {
                onDismiss();
            }
        };

        document.addEventListener("keydown", onKeyDown, true);
        // Capture phase, so a click that lands on another element closes this
        // menu before that element opens its own.
        document.addEventListener("pointerdown", onPointerDown, true);
        window.addEventListener("resize", onDismiss);
        window.addEventListener("scroll", onDismiss, true);

        return () => {
            document.removeEventListener("keydown", onKeyDown, true);
            document.removeEventListener("pointerdown", onPointerDown, true);
            window.removeEventListener("resize", onDismiss);
            window.removeEventListener("scroll", onDismiss, true);
        };
    }, [onDismiss]);

    return (
        <Popover anchor={anchor} placement="right" className="sbc-menu" role="menu" ariaLabel={title} interactive>
            <div ref={ref}>
                {title ? <div className="sbc-menu-title">{title}</div> : null}
                {entries.length === 0 ? (
                    <div className="sbc-menu-empty">{emptyMessage ?? "No actions available"}</div>
                ) : (
                    entries.map(entry => (
                        <button
                            key={entry.id}
                            type="button"
                            role="menuitem"
                            className={classNames("sbc-menu-item", `sbc-menu-item--${entry.style}`)}
                            disabled={!entry.action?.canExecute}
                            onClick={() => {
                                entry.action?.execute();
                                onDismiss();
                            }}
                        >
                            <MendixIcon icon={entry.icon} />
                            <span className="sbc-menu-caption">{entry.caption}</span>
                        </button>
                    ))
                )}
            </div>
        </Popover>
    );
}

export type ElementMenuConfig = Pick<
    StackedBarChartContainerProps,
    "menuItems" | "menuTitleTemplate" | "labelTemplate"
>;

/** Resolves the configured menu items against the clicked element. */
export function useElementMenuEntries(config: ElementMenuConfig, item: ObjectItem | undefined): MenuEntry[] {
    return useMemo(() => {
        if (!item) {
            return [];
        }
        return config.menuItems
            .map((menuItem, index) => ({ menuItem, index }))
            .filter(({ menuItem }) => readFlag(menuItem.itemVisible, item, true))
            .map(({ menuItem, index }) => ({
                id: `${index}`,
                caption: readText(menuItem.itemCaption, item) || `Action ${index + 1}`,
                style: menuItem.itemStyle,
                icon: menuItem.itemIcon,
                action: menuItem.itemAction?.get(item)
            }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.menuItems, item]);
}

export function elementMenuTitle(config: ElementMenuConfig, target: ElementTarget): string {
    const item = target.element.item;
    return readText(config.menuTitleTemplate, item) || readText(config.labelTemplate, item) || "Element";
}
