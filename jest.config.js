const base = require("@mendix/pluggable-widgets-tools/test-config/jest.config.js");

/**
 * The tools' own `test:unit:web` command hardcodes its config, which leaves no
 * room for a project setup file. Extending it here keeps every mapping the
 * toolchain provides (the `mendix` module mock in particular) while adding the
 * jsdom polyfills the pointer-event code needs.
 */
module.exports = {
    ...base,
    setupFilesAfterEnv: [...base.setupFilesAfterEnv, "<rootDir>/setupTests.ts"],
    collectCoverage: false
};
