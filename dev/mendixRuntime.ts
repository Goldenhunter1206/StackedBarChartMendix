/**
 * Runtime stand-in for the `mendix` module in the dev harness.
 * The published package is types-only; the Mendix client supplies these at run
 * time, and the widget only ever needs the enums.
 */
export const ValueStatus = {
    Available: "available",
    Unavailable: "unavailable",
    Loading: "loading"
} as const;

export const FormatterType = {
    Number: "number",
    DateTime: "datetime"
} as const;
