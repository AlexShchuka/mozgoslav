import styled from "styled-components";

/**
 * Full-height column: Dashboard sits at natural height on top, HomeList grows
 * to fill the rest (and scrolls internally). Requires the wrapping
 * `ContentFrame` in Layout.tsx to also be `display: flex; flex-direction:
 * column; flex: 1; min-height: 0;` — otherwise `flex: 1` here has nothing to
 * fill.
 */
export const HomeRoot = styled.div`
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
`;
