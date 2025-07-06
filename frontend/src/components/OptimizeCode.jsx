"use client"
import { useEffect, useRef } from "react"
import CodeEditor from "./CodeEditor"
import { SafeResizeObserver, isElementValid } from "../utils/resizeObserverErrorHandler"

const OptimizeCode = ({ code, language, optimizedCode, onOptimize, loading, darkMode }) => {
  const containerRef = useRef(null)
  const resizeObserverRef = useRef(null)

  useEffect(() => {
    const handleResize = () => {
      if (isElementValid(containerRef.current)) {
        requestAnimationFrame(() => {
          if (isElementValid(containerRef.current)) {
            try {
              containerRef.current.style.minHeight = "auto"
            } catch (error) {
              // Ignore styling errors
            }
          }
        })
      }
    }

    if (isElementValid(containerRef.current)) {
      resizeObserverRef.current = new SafeResizeObserver(handleResize)
      resizeObserverRef.current.observe(containerRef.current)
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
    }
  }, [])

  return (
    <div className="optimize-code" ref={containerRef}>
      <div className="glass-container">
        <div className="optimize-header">
          <h3>
            <span>⚡</span> Code Optimization
          </h3>
          <button className="btn btn-primary" onClick={onOptimize} disabled={loading}>
            {loading ? (
              <>
                <span className="loading-spinner"></span> Optimizing...
              </>
            ) : (
              <>
                <span>⚡</span> Optimize Code
              </>
            )}
          </button>
        </div>

        <div className="optimize-panels">
          <div className="optimize-panel">
            <h4>Original Code</h4>
            <CodeEditor
              language={language}
              code={code}
              onChange={() => {}}
              darkMode={darkMode}
              filename={`original.${language === "java" ? "java" : language === "python" ? "py" : "js"}`}
            />
          </div>

          <div className="optimize-panel">
            <h4>Optimized Code</h4>
            <CodeEditor
              language={language}
              code={optimizedCode}
              onChange={() => {}}
              darkMode={darkMode}
              filename={`optimized.${language === "java" ? "java" : language === "python" ? "py" : "js"}`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default OptimizeCode
