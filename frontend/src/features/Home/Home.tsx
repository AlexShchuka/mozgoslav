import { FC } from "react";

import Dashboard from "../Dashboard";
import HomeList from "./HomeList";
import { HomeRoot } from "./Home.style";

/**
 * Home — Dashboard (record / import controls) stacked on top of a unified
 * recordings list that subsumes both the former standalone Queue page and
 * the "recent notes" NotesList summary. One row per recording; progress bar
 * lives on every row, showing the live pipeline state (or 100% for Done,
 * idle for unscheduled recordings). Pagination is deferred until the post-
 * migration backend lands (meeting note 2026-04-18).
 */
const Home: FC = () => (
  <HomeRoot>
    <Dashboard />
    <HomeList />
  </HomeRoot>
);

export default Home;
