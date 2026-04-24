# stylelint

Add `stylelint` with the canonical config (`stylelint-config-standard` + styled-components plugin) and wire `npm run check-styles` into the frontend CI job. Catches typo'd props, duplicate rules, and off-token values inside styled-component template literals that prettier and ESLint do not see.
