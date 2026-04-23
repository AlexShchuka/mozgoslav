import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { HashRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { MotionConfig } from "framer-motion";

import App from "./App";
import { configureAppStore } from "./store";
import MozgoslavThemeProvider from "./styles/ThemeProvider";
import "./i18n";
import "react-toastify/dist/ReactToastify.css";

const { store } = configureAppStore();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found in index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <MozgoslavThemeProvider>
        {}
        <MotionConfig reducedMotion="user">
          <HashRouter>
            <App />
            <ToastContainer position="top-right" theme="colored" newestOnTop autoClose={3500} />
          </HashRouter>
        </MotionConfig>
      </MozgoslavThemeProvider>
    </Provider>
  </StrictMode>
);
