import { StrictMode, useCallback, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { StackedBarChart } from "../src/StackedBarChart";
import { generateTasks, mockProps, Task } from "./mockData";

interface Scenario {
    id: string;
    title: string;
    note: string;
    tasks: Task[];
    overrides?: Parameters<typeof mockProps>[0]["overrides"];
}

function useScenarios(): Scenario[] {
    return useMemo(
        () => [
            {
                id: "week",
                title: "A week of work",
                note: "Seven bars, colour by category, ordered by colour. Elements of the same colour stay separate.",
                tasks: generateTasks(7, 6)
            },
            {
                id: "sorted",
                title: "Sorted by priority within colour",
                note: "Colour first, then the Priority field ascending — the extra sort key the data carries.",
                tasks: generateTasks(7, 6),
                overrides: {
                    sortKeys: [
                        { sortSource: "color", sortAttribute: undefined, sortDirection: "asc" },
                        { sortSource: "attribute", sortAttribute: undefined, sortDirection: "asc" }
                    ]
                }
            },
            {
                id: "percentage",
                title: "100% stacked",
                note: "Every bar normalised to full height, so composition is comparable across days.",
                tasks: generateTasks(7, 6),
                overrides: { stackMode: "percentage", showBarTotals: false }
            },
            {
                id: "dense",
                title: "Dense data — 200 bars, ~10k elements",
                note: "Only the bars in view are mounted. Scroll horizontally; it should stay smooth.",
                tasks: generateTasks(200, 50),
                overrides: { barWidth: 40, barGap: 14, showLegend: false, sliverClustering: true }
            }
        ],
        []
    );
}

function App(): JSX.Element {
    const scenarios = useScenarios();
    const [log, setLog] = useState<string[]>([]);
    const onEvent = useCallback((message: string) => setLog(previous => [message, ...previous].slice(0, 6)), []);

    return (
        <>
            <div className="toolbar">
                <strong style={{ fontSize: 13 }}>Events:</strong>
                <span style={{ fontSize: 13, color: "#64748b" }}>{log[0] ?? "none yet"}</span>
            </div>
            {scenarios.map(scenario => (
                <section className="panel" key={scenario.id} data-scenario={scenario.id}>
                    <h2>{scenario.title}</h2>
                    <p>{scenario.note}</p>
                    <StackedBarChart
                        {...mockProps({ tasks: scenario.tasks, overrides: scenario.overrides, onEvent })}
                    />
                </section>
            ))}
        </>
    );
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
