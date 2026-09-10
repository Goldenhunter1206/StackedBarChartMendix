/**
 * Value axis helpers.
 *
 * The axis is rounded up to a "nice" number (1, 2, 2.5 or 5 times a power of
 * ten) so tick labels read cleanly and, just as importantly, so the axis does
 * not twitch on every small data change.
 */

const NICE_STEPS = [1, 2, 2.5, 5, 10];

export interface Scale {
    axisMax: number;
    ticks: number[];
}

/** Rounds `value` up to the next nice step. */
export function niceCeil(value: number): number {
    if (!isFinite(value) || value <= 0) {
        return 0;
    }
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const normalized = value / magnitude;
    for (const step of NICE_STEPS) {
        if (normalized <= step + 1e-9) {
            return step * magnitude;
        }
    }
    return 10 * magnitude;
}

/**
 * Builds the value axis for a chart whose largest bar totals `maxTotal`.
 * `targetTicks` is a hint, not a guarantee — the step is snapped to a nice
 * number first and the tick count follows from that.
 */
export function buildScale(maxTotal: number, targetTicks = 5): Scale {
    if (!isFinite(maxTotal) || maxTotal <= 0) {
        return { axisMax: 1, ticks: [0, 1] };
    }

    const rawStep = maxTotal / Math.max(1, targetTicks);
    const step = niceCeil(rawStep);
    const axisMax = Math.ceil(maxTotal / step - 1e-9) * step;

    const ticks: number[] = [];
    // Accumulating by index rather than by repeated addition keeps floating
    // point drift out of the tick labels.
    const count = Math.round(axisMax / step);
    for (let i = 0; i <= count; i++) {
        ticks.push(roundToStep(i * step, step));
    }
    return { axisMax, ticks };
}

function roundToStep(value: number, step: number): number {
    const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
    const factor = Math.pow(10, Math.min(decimals, 12));
    return Math.round(value * factor) / factor;
}

/** Formats a tick label compactly, so long axes stay readable. */
export function formatTick(value: number): string {
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000) {
        return `${trimZeros(value / 1_000_000_000)}B`;
    }
    if (abs >= 1_000_000) {
        return `${trimZeros(value / 1_000_000)}M`;
    }
    if (abs >= 10_000) {
        return `${trimZeros(value / 1000)}k`;
    }
    return trimZeros(value);
}

function trimZeros(value: number): string {
    return String(Math.round(value * 100) / 100);
}
