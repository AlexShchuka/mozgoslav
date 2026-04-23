import { FC } from "react";

import Dashboard from "../Dashboard";
import HomeList from "./HomeList";
import { HomeRoot } from "./Home.style";

const Home: FC = () => (
  <HomeRoot>
    <Dashboard />
    <HomeList />
  </HomeRoot>
);

export default Home;
