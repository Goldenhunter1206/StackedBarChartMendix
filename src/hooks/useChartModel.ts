import { useMemo } from "react";

import { BuildModelProps, buildModel } from "../model/buildModel";
import { ChartModel } from "../model/types";

/**
 * Rebuilds the chart model only when something it depends on actually changed.
 *
 * Mendix hands the widget freshly allocated accessor objects on every container
 * render, so depending on those directly would rebuild the model constantly and
 * make the memo pointless. Instead this keys off the identity of the items
 * arrays — stable for as long as the data is unchanged — plus a fingerprint of
 * the configuration values that affect the projection.
 *
 * The known gap: an expression that reads something outside the data source
 * (a page variable, say) can change its result without the items array
 * changing. Data source refresh is the documented remedy.
 */
export function useChartModel(props: BuildModelProps): ChartModel {
    const fingerprint = [
        props.colorMode,
        props.palette,
        props.customPalette,
        props.colorOrderMode,
        props.colorOrderList,
        props.barSortMode,
        props.barSortDirection,
        props.showEmptyBars,
        props.identityAttribute?.id ?? "",
        props.sortKeys.map(key => `${key.sortSource}:${key.sortDirection}:${key.sortAttribute?.id ?? ""}`).join("|")
    ].join("~");

    return useMemo(
        () => buildModel(props),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [props.datasource.items, props.datasource.status, props.barsDatasource?.items, fingerprint]
    );
}
