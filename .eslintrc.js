// Referenced by path rather than by package subpath: ESLint 9's eslintrc
// compatibility layer will not resolve a bare .json config out of a package.
module.exports = {
    extends: "./node_modules/@mendix/pluggable-widgets-tools/configs/eslint.ts.base.json",
    globals: {
        globalThis: "readonly"
    },
    rules: {
        "@typescript-eslint/no-non-null-assertion": "off"
    },
    overrides: [
        {
            // Test helpers read better without a return type on every arrow.
            files: ["**/*.spec.ts", "**/*.spec.tsx"],
            rules: { "@typescript-eslint/explicit-function-return-type": "off" }
        }
    ]
};
