import { ReactElement } from "react";

export function EmptyState({ message }: { message: string }): ReactElement {
    return <div className="sbc-empty">{message}</div>;
}

/** Placeholder shown while the data source is still loading. */
export function LoadingSkeleton(): ReactElement {
    const heights = [55, 80, 40, 95, 65, 75];
    return (
        <div className="sbc-skeleton" aria-hidden="true">
            {heights.map((height, index) => (
                <div key={index} className="sbc-skeleton-bar" style={{ height: `${height}%` }} />
            ))}
        </div>
    );
}
