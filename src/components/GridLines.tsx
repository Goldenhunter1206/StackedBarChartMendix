import { ReactElement } from "react";
import classNames from "classnames";

export interface GridLinesProps {
    ticks: number[];
    axisMax: number;
    plotHeight: number;
}

/** Horizontal rules behind the bars, one per axis tick. */
export function GridLines(props: GridLinesProps): ReactElement {
    return (
        <div className="sbc-grid" aria-hidden="true">
            {props.ticks.map(tick => (
                <div
                    key={tick}
                    className={classNames("sbc-grid-line", { "sbc-grid-line--base": tick === 0 })}
                    style={{ bottom: `${props.axisMax > 0 ? (tick / props.axisMax) * props.plotHeight : 0}px` }}
                />
            ))}
        </div>
    );
}
