import { ReactElement } from "react";

import { StackedBarChartContainerProps } from "../typings/StackedBarChartProps";
import "./ui/StackedBarChart.scss";

export function StackedBarChart(props: StackedBarChartContainerProps): ReactElement {
    return <div className={props.class}>{props.datasource.items?.length ?? 0}</div>;
}
