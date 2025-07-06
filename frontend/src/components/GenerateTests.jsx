"use client"
import { useEffect, useRef } from "react"
import CodeEditor from "./CodeEditor"
import { SafeResizeObserver, isElementValid } from "../utils/resizeObserverErrorHandler"

const GenerateTests = ({ code, language, testCode, onGenerateTests, loading, darkMode }) => {
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
    <div className="generate-tests" ref={containerRef}>
      <div className="glass-container">
        <div className="tests-header">
          <h3>
            <span>🧪</span> Test Generation
          </h3>
          <button className="btn btn-primary" onClick={onGenerateTests} disabled={loading}>
            {loading ? (
              <>
                <span className="loading-spinner"></span> Generating...
              </>
            ) : (
              <>
                <span>🧪</span> Generate Tests
              </>
            )}
          </button>
        </div>

        <div className="tests-panels">
          <div className="tests-panel">
            <h4>Source Code</h4>
            <CodeEditor
              language={language}
              code={code}
              onChange={() => {}}
              darkMode={darkMode}
              filename={`source.${language === "java" ? "java" : language === "python" ? "py" : "js"}`}
            />
          </div>

          <div className="tests-panel">
            <h4>Generated Tests</h4>
            <CodeEditor
              language={language}
              code={testCode}
              onChange={() => {}}
              darkMode={darkMode}
              filename={`test.${language === "java" ? "java" : language === "python" ? "py" : "js"}`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default GenerateTests
