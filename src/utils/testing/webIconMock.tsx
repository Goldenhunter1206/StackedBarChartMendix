import { ReactElement } from "react";

/**
 * Stand-in for mendix/components/web/Icon in tests.
 * The toolchain ships its own mock, but it is untransformed ESM inside
 * node_modules, which jest refuses to load.
 */
export function Icon({ icon }: { icon?: { iconClass?: string } }): ReactElement | null {
    return icon?.iconClass ? <span className={icon.iconClass} /> : null;
}
