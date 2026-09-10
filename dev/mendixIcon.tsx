import { ReactElement } from "react";

/** Dev-harness stand-in for mendix/components/web/Icon. */
export function Icon({ icon }: { icon?: { iconClass?: string } }): ReactElement | null {
    return icon?.iconClass ? <span className={icon.iconClass} /> : null;
}
