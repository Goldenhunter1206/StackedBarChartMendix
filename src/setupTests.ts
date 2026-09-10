import "@testing-library/jest-dom";

/**
 * jsdom implements neither pointer capture nor ResizeObserver, both of which
 * the chart relies on. Stubbing them here keeps the component tests honest:
 * the widget calls the real APIs and the stubs simply record that it did.
 */
const elementProto = Element.prototype as unknown as Record<string, unknown>;
if (typeof elementProto.setPointerCapture !== "function") {
    elementProto.setPointerCapture = () => undefined;
    elementProto.releasePointerCapture = () => undefined;
    elementProto.hasPointerCapture = () => false;
}

if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class ResizeObserver {
        observe(): void {
            /* no-op */
        }
        unobserve(): void {
            /* no-op */
        }
        disconnect(): void {
            /* no-op */
        }
    } as unknown as typeof ResizeObserver;
}

if (typeof globalThis.matchMedia === "undefined") {
    globalThis.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false
    })) as unknown as typeof globalThis.matchMedia;
}
