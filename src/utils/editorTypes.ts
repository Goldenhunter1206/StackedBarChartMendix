/**
 * The Studio Pro editor contract.
 *
 * Mendix does not publish these types on npm (its own widgets get them from an
 * internal package), so they are declared here to match the documented shapes
 * that `getProperties` and `check` are called with.
 */

export interface Property {
    key: string;
    caption: string;
    description?: string;
    objectHeaders?: string[];
    objects?: ObjectProperties[];
    properties?: Properties[];
}

export interface ObjectProperties {
    properties: PropertyGroup[];
    captions?: string[];
}

export interface PropertyGroup {
    caption: string;
    propertyGroups?: PropertyGroup[];
    properties?: Property[];
}

export type Properties = PropertyGroup[];

export interface Problem {
    property?: string;
    severity?: "error" | "warning" | "deprecation";
    message: string;
    studioMessage?: string;
    url?: string;
    studioUrl?: string;
}

/** Removes top-level properties from the Studio Pro property grid. */
export function hideProperties(properties: Properties, keys: string[]): void {
    if (keys.length === 0) {
        return;
    }
    const hidden = new Set(keys);
    for (const group of properties) {
        pruneGroup(group, hidden);
    }
}

function pruneGroup(group: PropertyGroup, hidden: Set<string>): void {
    if (group.properties) {
        group.properties = group.properties.filter(property => !hidden.has(property.key));
    }
    group.propertyGroups?.forEach(child => pruneGroup(child, hidden));
}

/**
 * Removes properties from one row of an object-list property, so each row of a
 * list can show only the fields its own configuration makes relevant.
 */
export function hideNestedProperties(properties: Properties, listKey: string, rowIndex: number, keys: string[]): void {
    const list = findProperty(properties, listKey);
    const row = list?.objects?.[rowIndex];
    if (!row) {
        return;
    }
    const hidden = new Set(keys);
    row.properties.forEach(group => pruneGroup(group, hidden));
}

function findProperty(properties: Properties, key: string): Property | undefined {
    for (const group of properties) {
        const match = group.properties?.find(property => property.key === key);
        if (match) {
            return match;
        }
        const nested = group.propertyGroups ? findProperty(group.propertyGroups, key) : undefined;
        if (nested) {
            return nested;
        }
    }
    return undefined;
}
