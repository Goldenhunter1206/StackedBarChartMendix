import "@testing-library/jest-dom";

/**
 * jsdom implements neither pointer capture nor ResizeObserver, both of which
 * the chart relies on. Stubbing them here keeps the component tests honest:
 * the widget calls the real APIs and the stubs simply record that it did.
 */
/*
 * jsdom has no PointerEvent, so without this the pointer-driven drag code
 * receives events carrying no button and no coordinates, and silently does
 * nothing — which would let a broken drag pass its tests.
 */
if (typeof globalThis.PointerEvent === "undefined") {
    class PointerEventPolyfill extends MouseEvent {
        readonly pointerId: number;
        readonly pointerType: string;
        readonly isPrimary: boolean;

        constructor(type: string, init: PointerEventInit = {}) {
            super(type, init);
            this.pointerId = init.pointerId ?? 0;
            this.pointerType = init.pointerType ?? "mouse";
            this.isPrimary = init.isPrimary ?? true;
        }
    }
    globalThis.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}

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
