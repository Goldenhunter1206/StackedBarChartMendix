import { ReactElement } from "react";
import { Icon } from "mendix/components/web/Icon";
import { DynamicValue, WebIcon } from "mendix";

/**
 * Renders a Studio Pro icon property, or nothing when none is configured.
 * Wrapped so callers do not each have to unwrap the DynamicValue.
 */
export function MendixIcon({ icon }: { icon?: unknown }): ReactElement | null {
    const value = icon as DynamicValue<WebIcon> | undefined;
    if (!value?.value) {
        return null;
    }
    return (
        <span className="sbc-menu-icon" aria-hidden="true">
            <Icon icon={value.value} />
        </span>
    );
}
