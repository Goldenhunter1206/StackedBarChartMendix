import { ReactElement } from "react";
import classNames from "classnames";

import { LegendEntry } from "../model/types";

export interface LegendProps {
    entries: LegendEntry[];
    /** Colour key currently hovered, or null when nothing is highlighted. */
    activeColorKey: string | null;
    onHover: (colorKey: string | null) => void;
}

export function Legend(props: LegendProps): ReactElement {
    return (
        <ul className="sbc-legend">
            {props.entries.map(entry => (
                <li key={entry.colorKey}>
                    <button
                        type="button"
                        className={classNames("sbc-legend-item", {
                            "sbc-legend-item--dimmed":
                                props.activeColorKey !== null && props.activeColorKey !== entry.colorKey
                        })}
                        onMouseEnter={() => props.onHover(entry.colorKey)}
                        onMouseLeave={() => props.onHover(null)}
                        onFocus={() => props.onHover(entry.colorKey)}
                        onBlur={() => props.onHover(null)}
                    >
                        <span className="sbc-legend-swatch" style={{ background: entry.color }} aria-hidden="true" />
                        {entry.label}
                        <span aria-hidden="true"> ({entry.count})</span>
                    </button>
                </li>
            ))}
        </ul>
    );
}
