import { Fragment, ReactElement } from "react";

import { formatTick } from "../model/scale";
import { CAPTION_HEIGHT, HEADROOM } from "../ui/constants";

export interface ValueAxisProps {
    ticks: number[];
    axisMax: number;
    plotHeight: number;
    captionHeight: number;
    title: string;
    /** Percentage mode labels ticks as percentages rather than raw values. */
    percentage: boolean;
}

export function ValueAxis(props: ValueAxisProps): ReactElement {
    const { axisMax, plotHeight, captionHeight } = props;

    return (
        <div className="sbc-axis" aria-hidden="true">
            {props.title ? <span className="sbc-axis-title">{props.title}</span> : null}
            {props.ticks.map(tick => (
                <Fragment key={tick}>
                    <span
                        className="sbc-axis-tick"
                        style={{ bottom: `${captionHeight + (axisMax > 0 ? (tick / axisMax) * plotHeight : 0)}px` }}
                    >
                        {props.percentage ? `${formatTick(tick)}%` : formatTick(tick)}
                    </span>
                </Fragment>
            ))}
        </div>
    );
}

/** Height the frame needs for a given plot height. */
export function frameHeight(plotHeight: number, captionHeight: number): number {
    return HEADROOM + plotHeight + captionHeight;
}

export { CAPTION_HEIGHT };
