import React from "react"
import ReactDOM from "react-dom/client"
import "./styles/index.css"
import App from "./App"
import { suppressResizeObserverError } from "./utils/resizeObserverErrorHandler"

// Suppress ResizeObserver errors globally before app starts
suppressResizeObserverError()

const root = ReactDOM.createRoot(document.getElementById("root"))
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
