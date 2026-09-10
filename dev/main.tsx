import { StrictMode, useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ObjectItem } from "mendix";

import { StackedBarChart } from "../src/StackedBarChart";
import { generateTasks, mockProps, Task } from "./mockData";
import { objectItems } from "./mockMendix";

interface ScenarioSpec {
    id: string;
    title: string;
    note: string;
    tasks: Task[];
    overrides?: Parameters<typeof mockProps>[0]["overrides"];
}

/**
 * One chart, backed by state that behaves the way a Mendix data source does:
 * a refresh yields a new items array carrying the same object ids.
 */
function Scenario({ spec, onEvent }: { spec: ScenarioSpec; onEvent: (message: string) => void }): JSX.Element {
    const [tasks, setTasks] = useState(spec.tasks);
    const [version, setVersion] = useState(0);

    /*
     * Every scenario starts in Loading, because that is what a real Mendix data
     * source does and the harness previously skipped it — which hid a bug where
     * the chart rendered but nothing was interactive, since the listeners are
     * attached to a plot container that does not exist during the skeleton.
     */
    const [ready, setReady] = useState(false);
    useEffect(() => {
        const timer = window.setTimeout(() => setReady(true), 120);
        return () => window.clearTimeout(timer);
    }, []);

    const ids = useMemo(() => objectItems(tasks.length).map(item => item.id), [tasks.length]);
    // New array identity per refresh, stable ids inside it.
    const items = useMemo(() => ids.map(id => ({ id }) as ObjectItem), [ids, version]);

    const onMove = useCallback(
        (elementId: string, targetBarKey: string, targetIndex: number) => {
            setTasks(current => {
                const from = ids.indexOf(elementId);
                if (from === -1) {
                    return current;
                }
                const next = [...current];
                const [moved] = next.splice(from, 1);
                const relocated = { ...moved, day: targetBarKey };
                // Place it among that bar's tasks at the requested position.
                const sameBar = next.map((t, i) => (t.day === targetBarKey ? i : -1)).filter(i => i !== -1);
                const insertAt = targetIndex >= sameBar.length ? (sameBar[sameBar.length - 1] ?? next.length - 1) + 1 : sameBar[targetIndex];
                next.splice(insertAt, 0, relocated);
                return next;
            });
            setVersion(v => v + 1);
        },
        [ids]
    );

    const props = mockProps({ tasks, items, overrides: spec.overrides, onEvent, onMove });

    return (
        <section className="panel" data-scenario={spec.id}>
            <h2>{spec.title}</h2>
            <p>{spec.note}</p>
            <StackedBarChart
                {...props}
                datasource={
                    ready
                        ? props.datasource
                        : ({ ...props.datasource, status: "loading", items: undefined } as typeof props.datasource)
                }
            />
        </section>
    );
}

function App(): JSX.Element {
    const [log, setLog] = useState<string[]>([]);
    const onEvent = useCallback((message: string) => setLog(previous => [message, ...previous].slice(0, 6)), []);

    const scenarios = useMemo<ScenarioSpec[]>(
        () => [
            {
                id: "week",
                title: "A week of work",
                note: "Seven bars, colour by category, ordered by colour. Elements of the same colour stay separate. Drag between bars.",
                tasks: generateTasks(7, 6)
            },
            {
                id: "sorted",
                title: "Sorted by priority within colour",
                note: "Colour first, then Priority ascending — the extra field the data carries.",
                tasks: generateTasks(7, 6),
                overrides: {
                    sortKeys: [
                        { sortSource: "color", sortAttribute: undefined, sortDirection: "asc" },
                        { sortSource: "attribute", sortAttribute: undefined, sortDirection: "asc" }
                    ]
                }
            },
            {
                id: "confirm",
                title: "Drag with confirmation",
                note: "The same chart with the built-in confirmation dialog enabled.",
                tasks: generateTasks(5, 5),
                overrides: { confirmationMode: "dialog", showLegend: false }
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

    return (
        <>
            <div className="toolbar">
                <strong style={{ fontSize: 13 }}>Events:</strong>
                <span style={{ fontSize: 13, color: "#64748b" }}>{log[0] ?? "none yet"}</span>
            </div>
            {scenarios.map(spec => (
                <Scenario key={spec.id} spec={spec} onEvent={onEvent} />
            ))}
        </>
    );
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
