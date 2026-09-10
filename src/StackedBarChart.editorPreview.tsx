import { ReactElement } from "react";

import { StackedBarChartPreviewProps } from "../typings/StackedBarChartProps";
import { PALETTES } from "./model/color";
import "./ui/StackedBarChart.scss";

const SAMPLE: number[][] = [
    [3, 2, 4],
    [5, 3, 2, 1],
    [2, 6],
    [4, 4, 3]
];

/**
 * Design-mode preview.
 *
 * Studio Pro has no data, so this draws a representative chart from fixed
 * numbers using the real stylesheet — the point is that the modeller can see
 * the size and shape the widget will occupy on the page.
 */
export function preview(props: StackedBarChartPreviewProps): ReactElement {
    const palette = PALETTES.vivid;
    const plotHeight = Math.max(120, (props.heightValue ?? 420) - 70);
    const barWidth = Math.max(16, props.barWidth ?? 56);
    const barGap = Math.max(4, props.barGap ?? 24);
    const maxTotal = Math.max(...SAMPLE.map(values => values.reduce((sum, value) => sum + value, 0)));

    return (
        <div
            className="sbc"
            style={{
                ["--sbc-plot-height" as string]: `${plotHeight}px`,
                ["--sbc-headroom" as string]: "24px",
                ["--sbc-caption-height" as string]: "24px"
            }}
        >
            <div className="sbc-frame" style={{ height: `${plotHeight + 48}px` }}>
                {props.showValueAxis ? <div className="sbc-axis" /> : null}
                <div className="sbc-scroll">
                    <div
                        className="sbc-canvas"
                        style={{ width: `${SAMPLE.length * (barWidth + barGap)}px`, height: "100%" }}
                    >
                        {SAMPLE.map((values, barIndex) => {
                            let offset = 0;
                            return (
                                <div
                                    key={barIndex}
                                    className="sbc-bar"
                                    style={{
                                        left: `${barGap / 2 + barIndex * (barWidth + barGap)}px`,
                                        width: `${barWidth}px`
                                    }}
                                >
                                    <div className="sbc-bar-stack">
                                        {values.map((value, index) => {
                                            const height = (value / maxTotal) * plotHeight;
                                            const y = offset;
                                            offset += height + 2;
                                            return (
                                                <div
                                                    key={index}
                                                    className="sbc-seg"
                                                    style={{
                                                        height: `${height}px`,
                                                        transform: `translate3d(0, ${-y}px, 0)`,
                                                        background: palette[(barIndex + index) % palette.length],
                                                        ["--sbc-seg-radius" as string]: `${props.cornerRadius ?? 6}px`
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                    {props.showCategoryAxis ? (
                                        <div className="sbc-bar-caption">Bar {barIndex + 1}</div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
