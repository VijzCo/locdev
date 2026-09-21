// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { AuthProvider } from "./context/AuthContext.jsx";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./index.css";
import { initDevice } from "./lib/device.js";

initDevice(); // adopt native install id/model on the APK; harmless on web

// Inside the Android APK the WebView can't resolve path-based routes on reload
// (it falls back to the root file), so use hash routing there. The web build
// keeps clean path URLs unchanged.
const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  </React.StrictMode>
);
