import { FC } from "react";

import Dashboard from "../Dashboard";
import Queue from "../Queue";

/**
 * Task L1 — "Мозгослав" home page. Previously split as /dashboard (record
 * controls + recent recordings) and /queue (processing jobs). Operationally
 * it was always one screen: record → see what's running → see the note,
 * so the merge removes a click without losing any feature. Both children
 * keep their own data subscriptions; this component is a layout shell.
 */
const Home: FC = () => (
  <>
    <Dashboard />
    <Queue />
  </>
);

export default Home;
