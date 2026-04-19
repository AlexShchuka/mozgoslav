/* eslint-env node */
module.exports = function plopConfig(plop) {
    const srcRoot = "src";
    const templatesDir = "plop-templates";

    plop.setGenerator("feature", {
        description: "Generate a new feature (Component + style + container + types + index)",
        prompts: [
            {
                type: "input",
                name: "name",
                message: "Feature name (PascalCase):",
            },
        ],
        actions: [
            {
                type: "add",
                path: `${srcRoot}/features/{{pascalCase name}}/{{pascalCase name}}.tsx`,
                templateFile: `${templatesDir}/feature/Component.tsx.hbs`,
            },
            {
                type: "add",
                path: `${srcRoot}/features/{{pascalCase name}}/{{pascalCase name}}.style.ts`,
                templateFile: `${templatesDir}/feature/Component.style.ts.hbs`,
            },
            {
                type: "add",
                path: `${srcRoot}/features/{{pascalCase name}}/{{pascalCase name}}.container.ts`,
                templateFile: `${templatesDir}/feature/Component.container.ts.hbs`,
            },
            {
                type: "add",
                path: `${srcRoot}/features/{{pascalCase name}}/types.ts`,
                templateFile: `${templatesDir}/feature/types.ts.hbs`,
            },
        ],
    });

    plop.setGenerator("slice", {
        description: "Generate a new store slice (actions + reducer + saga + selectors)",
        prompts: [
            {
                type: "input",
                name: "name",
                message: "Slice name (camelCase):",
            },
        ],
        actions: [
            {
                type: "add",
                path: `${srcRoot}/store/slices/{{camelCase name}}/actions.ts`,
                templateFile: `${templatesDir}/slice/actions.ts.hbs`,
            },
            {
                type: "add",
                path: `${srcRoot}/store/slices/{{camelCase name}}/reducer.ts`,
                templateFile: `${templatesDir}/slice/reducer.ts.hbs`,
            },
            {
                type: "add",
                path: `${srcRoot}/store/slices/{{camelCase name}}/saga.ts`,
                templateFile: `${templatesDir}/slice/saga.ts.hbs`,
            },
            {
                type: "add",
                path: `${srcRoot}/store/slices/{{camelCase name}}/selectors.ts`,
                templateFile: `${templatesDir}/slice/selectors.ts.hbs`,
            },
        ],
    });
};
