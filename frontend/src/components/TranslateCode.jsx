"use client"
import { useEffect, useRef } from "react"
import CodeEditor from "./CodeEditor"
import { SafeResizeObserver, isElementValid } from "../utils/resizeObserverErrorHandler"

const TranslateCode = ({
  code,
  language,
  targetLanguage,
  setTargetLanguage,
  translatedCode,
  onTranslate,
  loading,
  darkMode,
}) => {
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

  const languages = [
    { value: "python", label: "Python" },
    { value: "javascript", label: "JavaScript" },
    { value: "java", label: "Java" },
    { value: "cpp", label: "C++" },
    { value: "c", label: "C" },
    { value: "go", label: "Go" },
    { value: "rust", label: "Rust" },
    { value: "php", label: "PHP" },
    { value: "ruby", label: "Ruby" },
    { value: "kotlin", label: "Kotlin" },
    { value: "swift", label: "Swift" },
  ]

  return (
    <div className="translate-code" ref={containerRef}>
      <div className="glass-container">
        <div className="translate-header">
          <h3>
            <span>🔄</span> Code Translation
          </h3>
          <div className="translate-controls">
            <span>From: {language}</span>
            <span>→</span>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="language-select"
            >
              {languages
                .filter((lang) => lang.value !== language)
                .map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
            </select>
            <button className="btn btn-primary" onClick={onTranslate} disabled={loading}>
              {loading ? (
                <>
                  <span className="loading-spinner"></span> Translating...
                </>
              ) : (
                <>
                  <span>🔄</span> Translate
                </>
              )}
            </button>
          </div>
        </div>

        <div className="translate-panels">
          <div className="translate-panel">
            <h4>Original Code ({language})</h4>
            <CodeEditor
              language={language}
              code={code}
              onChange={() => {}}
              darkMode={darkMode}
              filename={`original_${language === "java" ? "Main" : "code"}.${language === "java" ? "java" : language === "python" ? "py" : "js"}`}
            />
          </div>

          <div className="translate-panel">
            <h4>Translated Code ({targetLanguage})</h4>
            <CodeEditor
              language={targetLanguage}
              code={translatedCode}
              onChange={() => {}}
              darkMode={darkMode}
              filename={`translated_${targetLanguage === "java" ? "Main" : "code"}.${targetLanguage === "java" ? "java" : targetLanguage === "python" ? "py" : "js"}`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default TranslateCode
