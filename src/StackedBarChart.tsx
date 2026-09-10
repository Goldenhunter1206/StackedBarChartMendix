import { ReactElement } from "react";

import { Chart } from "./components/Chart";
import { StackedBarChartContainerProps } from "../typings/StackedBarChartProps";
import "./ui/StackedBarChart.scss";

export function StackedBarChart(props: StackedBarChartContainerProps): ReactElement {
    return <Chart {...props} />;
}
