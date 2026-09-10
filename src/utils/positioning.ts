/**
 * Placement maths for floating panels (tooltip, menus, dialogs).
 *
 * Hand-rolled rather than pulled from a positioning library: the widget only
 * needs flip-and-clamp against the viewport, and Mendix widgets are loaded into
 * every page of an app, so a smaller bundle is worth more than generality.
 */

export type Placement = "top" | "bottom" | "left" | "right";

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Size {
    width: number;
    height: number;
}

export interface PositionOptions {
    placement: Placement;
    /** Gap in px between the anchor and the panel. */
    offset: number;
    /** Minimum gap in px between the panel and the viewport edge. */
    padding: number;
}

export interface Position {
    x: number;
    y: number;
    placement: Placement;
}

const OPPOSITE: Record<Placement, Placement> = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left"
};

/**
 * Places `panel` next to `anchor`, flipping to the opposite side when the
 * preferred side does not fit, then clamping so the panel always stays fully
 * on screen. Coordinates are viewport-relative, for use with position: fixed.
 */
export function positionFloating(anchor: Rect, panel: Size, viewport: Size, options: PositionOptions): Position {
    const placement = fits(anchor, panel, viewport, options.placement, options)
        ? options.placement
        : fits(anchor, panel, viewport, OPPOSITE[options.placement], options)
        ? OPPOSITE[options.placement]
        : options.placement;

    const { x, y } = coordsFor(anchor, panel, placement, options.offset);
    return {
        x: clamp(x, options.padding, viewport.width - panel.width - options.padding),
        y: clamp(y, options.padding, viewport.height - panel.height - options.padding),
        placement
    };
}

function coordsFor(anchor: Rect, panel: Size, placement: Placement, offset: number): { x: number; y: number } {
    const centerX = anchor.x + anchor.width / 2 - panel.width / 2;
    const centerY = anchor.y + anchor.height / 2 - panel.height / 2;

    switch (placement) {
        case "top":
            return { x: centerX, y: anchor.y - panel.height - offset };
        case "bottom":
            return { x: centerX, y: anchor.y + anchor.height + offset };
        case "left":
            return { x: anchor.x - panel.width - offset, y: centerY };
        case "right":
            return { x: anchor.x + anchor.width + offset, y: centerY };
    }
}

function fits(anchor: Rect, panel: Size, viewport: Size, placement: Placement, options: PositionOptions): boolean {
    const { x, y } = coordsFor(anchor, panel, placement, options.offset);
    switch (placement) {
        case "top":
            return y >= options.padding;
        case "bottom":
            return y + panel.height <= viewport.height - options.padding;
        case "left":
            return x >= options.padding;
        case "right":
            return x + panel.width <= viewport.width - options.padding;
    }
}

function clamp(value: number, min: number, max: number): number {
    // A panel taller or wider than the viewport would invert the bounds, so
    // honour the minimum and let it overflow the far edge instead.
    return max < min ? min : Math.min(Math.max(value, min), max);
}
