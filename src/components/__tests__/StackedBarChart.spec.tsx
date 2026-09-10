import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Big } from "big.js";

import { StackedBarChart } from "../../StackedBarChart";
import {
    big,
    listAction,
    listAttribute,
    listExpression,
    listValue,
    objectItems,
    sampleRows,
    TestRow,
    widgetProps
} from "../../utils/testing/widgetProps";

const segments = (container: HTMLElement): HTMLElement[] =>
    Array.from(container.querySelectorAll<HTMLElement>(".sbc-seg"));

const barKeys = (container: HTMLElement): string[] =>
    Array.from(container.querySelectorAll<HTMLElement>(".sbc-bar")).map(bar => bar.dataset.bar ?? "");

describe("StackedBarChart", () => {
    it("groups elements into bars and renders one node per element", () => {
        const { container } = render(<StackedBarChart {...widgetProps(sampleRows())} />);

        expect(barKeys(container)).toEqual(["Mon", "Tue"]);
        expect(segments(container)).toHaveLength(4);
    });

    it("keeps elements of the same colour separate", () => {
        const rows: TestRow[] = [
            { bar: "A", label: "one", value: 1, color: "#ff0000" },
            { bar: "A", label: "two", value: 1, color: "#ff0000" },
            { bar: "A", label: "three", value: 1, color: "#ff0000" }
        ];
        const { container } = render(<StackedBarChart {...widgetProps(rows)} />);

        // Three identically coloured elements stay three separate nodes.
        expect(segments(container)).toHaveLength(3);
    });

    it("shows the empty message when there is no data", () => {
        render(<StackedBarChart {...widgetProps([], { emptyMessage: "Nothing here" })} />);
        expect(screen.getByText("Nothing here")).toBeInTheDocument();
    });

    it("says how much data is hidden rather than truncating silently", () => {
        const props = widgetProps(sampleRows());
        render(
            <StackedBarChart
                {...props}
                maxItems={4}
                datasource={listValue(props.datasource.items!, { hasMoreItems: true, totalCount: 120 })}
            />
        );
        expect(screen.getByRole("status")).toHaveTextContent("Showing 4 of 120 elements");
    });

    describe("tooltip", () => {
        it("appears on hover with the configured fields", async () => {
            const user = userEvent.setup();
            const rows = sampleRows();
            const props = widgetProps(rows);
            const items = props.datasource.items!;

            const { container } = render(
                <StackedBarChart
                    {...props}
                    tooltipFields={[
                        {
                            fieldCaption: "Owner",
                            fieldValue: listExpression<string>(item => `owner-${items.indexOf(item)}`),
                            fieldVisible: undefined
                        }
                    ]}
                />
            );

            await user.hover(segments(container)[0]);

            const tooltip = await screen.findByRole("tooltip");
            expect(tooltip).toHaveTextContent("Owner");
            expect(tooltip).toHaveTextContent("% of bar");
        });

        it("evaluates field expressions only for the hovered element", async () => {
            const user = userEvent.setup();
            const props = widgetProps(sampleRows());
            const field = listExpression<string>(() => "value");

            const { container } = render(
                <StackedBarChart
                    {...props}
                    tooltipFields={[{ fieldCaption: "Field", fieldValue: field, fieldVisible: undefined }]}
                />
            );

            expect(field.callCount).toBe(0);

            await user.hover(segments(container)[0]);
            await screen.findByRole("tooltip");

            // One element hovered, so exactly one element's field is read.
            expect(field.callCount).toBe(1);
        });
    });

    describe("element menu", () => {
        it("opens on click and runs the configured action against that element", async () => {
            const user = userEvent.setup();
            const props = widgetProps(sampleRows());
            const action = listAction();

            const { container } = render(
                <StackedBarChart
                    {...props}
                    menuItems={[
                        {
                            itemCaption: listExpression<string>(() => "Edit"),
                            itemIcon: undefined,
                            itemAction: action,
                            itemVisible: undefined,
                            itemStyle: "default"
                        }
                    ]}
                />
            );

            const first = segments(container)[0];
            await user.click(first);

            const menu = await screen.findByRole("menu");
            expect(menu).toBeInTheDocument();

            await user.click(screen.getByRole("menuitem", { name: "Edit" }));

            const clicked = props.datasource.items!.find(item => item.id === first.dataset.el)!;
            expect(action.for(clicked).execute).toHaveBeenCalled();
            await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
        });

        it("hides items whose visibility expression is false", async () => {
            const user = userEvent.setup();
            const props = widgetProps(sampleRows());

            const { container } = render(
                <StackedBarChart
                    {...props}
                    menuItems={[
                        {
                            itemCaption: listExpression<string>(() => "Visible"),
                            itemIcon: undefined,
                            itemAction: listAction(),
                            itemVisible: undefined,
                            itemStyle: "default"
                        },
                        {
                            itemCaption: listExpression<string>(() => "Hidden"),
                            itemIcon: undefined,
                            itemAction: listAction(),
                            itemVisible: listExpression<boolean>(() => false),
                            itemStyle: "default"
                        }
                    ]}
                />
            );

            await user.click(segments(container)[0]);
            await screen.findByRole("menu");

            expect(screen.getByRole("menuitem", { name: "Visible" })).toBeInTheDocument();
            expect(screen.queryByRole("menuitem", { name: "Hidden" })).not.toBeInTheDocument();
        });
    });

    describe("add button", () => {
        it("passes the bar context to the action as typed variables", async () => {
            const user = userEvent.setup();
            const props = widgetProps(sampleRows());

            const { container } = render(<StackedBarChart {...props} />);
            const addButton = container.querySelector<HTMLElement>('[data-add="Mon"]')!;
            await user.click(addButton);

            expect(props.onAddElement!.execute).toHaveBeenCalledTimes(1);
            const args = (props.onAddElement!.execute as jest.Mock).mock.calls[0][0];
            expect(args.barKey).toBe("Mon");
            expect(Number(args.barIndex)).toBe(0);
            // Mon holds three elements, so a new one goes on top at index 3.
            expect(Number(args.insertIndex)).toBe(3);
            expect(Number(args.barTotal)).toBe(9);
        });

        it("prefers the bar object when a bars data source is configured", async () => {
            const user = userEvent.setup();
            const rows = sampleRows();
            const props = widgetProps(rows);

            const barItems = objectItems(2, "bar");
            const barKeys = ["Mon", "Tue"];
            const onBarAdd = listAction();

            const { container } = render(
                <StackedBarChart
                    {...props}
                    barsDatasource={listValue(barItems)}
                    barsKeyAttribute={listAttribute<string>(item => barKeys[barItems.indexOf(item)])}
                    onBarAdd={onBarAdd}
                />
            );

            await user.click(container.querySelector<HTMLElement>('[data-add="Mon"]')!);

            expect(onBarAdd.for(barItems[0]).execute).toHaveBeenCalled();
            expect(props.onAddElement!.execute).not.toHaveBeenCalled();
        });
    });

    describe("sorting", () => {
        it("orders elements by the configured keys", () => {
            const rows = sampleRows();
            const props = widgetProps(rows);
            const items = props.datasource.items!;
            const priority = listAttribute<Big>(item => big(rows[items.indexOf(item)].priority ?? 0), {
                type: "Integer"
            });

            const { container } = render(
                <StackedBarChart
                    {...props}
                    sortKeys={[
                        { sortSource: "color", sortAttribute: undefined, sortDirection: "asc" },
                        { sortSource: "attribute", sortAttribute: priority, sortDirection: "asc" }
                    ]}
                />
            );

            const mon = container.querySelector<HTMLElement>('[data-bar="Mon"]')!;
            const labels = Array.from(mon.querySelectorAll(".sbc-seg-label")).map(node => node.textContent);
            // Red first (first seen), and within red, priority 1 before 2.
            expect(labels).toEqual(["Delta", "Alpha", "Gamma"]);
        });
    });

    describe("performance", () => {
        it("mounts only the bars that can be on screen", () => {
            const rows: TestRow[] = [];
            for (let bar = 0; bar < 400; bar++) {
                for (let i = 0; i < 25; i++) {
                    rows.push({ bar: `Bar ${bar}`, label: `e${i}`, value: 1 + (i % 5), color: "#3366ff" });
                }
            }

            const { container } = render(<StackedBarChart {...widgetProps(rows)} />);

            // 10,000 elements in the data, a bounded number of nodes in the DOM.
            expect(barKeys(container).length).toBeLessThanOrEqual(45);
            expect(segments(container).length).toBeLessThan(1200);
        });
    });
});
