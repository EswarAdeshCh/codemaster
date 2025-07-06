"use client"
import Editor from "@monaco-editor/react"
import { useEffect, useRef, useCallback } from "react"
import { SafeResizeObserver } from "../utils/resizeObserverErrorHandler"

const CodeEditor = ({ language, code, onChange, darkMode, showActions = true, filename }) => {
  const editorRef = useRef(null)
  const containerRef = useRef(null)
  const resizeObserverRef = useRef(null)
  const isEditorMountedRef = useRef(false)
  const layoutTimeoutRef = useRef(null)
  const lastLayoutTimeRef = useRef(0)
  const isLayoutInProgressRef = useRef(false)

  const handleEditorChange = useCallback(
    (value) => {
      onChange(value || "")
    },
    [onChange],
  )

  // Copy code to clipboard
  const copyCode = useCallback(() => {
    if (code) {
      navigator.clipboard.writeText(code).then(() => {
        // Show toast notification
        const event = new CustomEvent("showToast", {
          detail: { message: "Code copied to clipboard!", type: "success" },
        })
        window.dispatchEvent(event)
      })
    }
  }, [code])

  // Download code as file with proper filename
  const downloadCode = useCallback(() => {
    if (code) {
      // Use filename from props if available, otherwise generate one
      let downloadFilename = filename

      if (!downloadFilename || !downloadFilename.trim()) {
        const getLanguageExtension = (lang) => {
          const extensions = {
            python: "py",
            javascript: "js",
            java: "java",
            cpp: "cpp",
            c: "c",
            go: "go",
            rust: "rs",
            php: "php",
            ruby: "rb",
            kotlin: "kt",
            swift: "swift",
          }
          return extensions[lang] || "txt"
        }
        downloadFilename = `code.${getLanguageExtension(language)}`
      }

      const blob = new Blob([code], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = downloadFilename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Show toast notification
      const event = new CustomEvent("showToast", {
        detail: { message: `Code downloaded as ${downloadFilename}!`, type: "success" },
      })
      window.dispatchEvent(event)
    }
  }, [code, language, filename])

  // Debounced and controlled layout recalculation
  const forceLayout = useCallback(() => {
    if (
      !isEditorMountedRef.current ||
      !editorRef.current ||
      typeof editorRef.current.layout !== "function" ||
      isLayoutInProgressRef.current
    ) {
      return
    }

    const now = Date.now()
    const timeSinceLastLayout = now - lastLayoutTimeRef.current

    // Prevent too frequent layout calls (minimum 100ms between layouts)
    if (timeSinceLastLayout < 100) {
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current)
      }

      layoutTimeoutRef.current = setTimeout(() => {
        forceLayout()
      }, 100 - timeSinceLastLayout)
      return
    }

    try {
      isLayoutInProgressRef.current = true
      lastLayoutTimeRef.current = now

      // Get container dimensions to ensure we don't exceed them
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect()
        const maxWidth = containerRect.width
        const maxHeight = 400 // Fixed height as per CSS

        // Only layout if container has valid dimensions
        if (maxWidth > 0 && maxHeight > 0) {
          editorRef.current.layout({
            width: Math.floor(maxWidth),
            height: maxHeight,
          })
        }
      } else {
        // Fallback to automatic layout
        editorRef.current.layout()
      }
    } catch (error) {
      console.debug("Editor layout error (non-critical):", error.message)
    } finally {
      isLayoutInProgressRef.current = false
    }
  }, [])

  const handleEditorDidMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor
      isEditorMountedRef.current = true

      // Configure editor options for better UX (without suggestions)
      editor.updateOptions({
        cursorBlinking: "blink", // Enable cursor blinking
        cursorSmoothCaretAnimation: "on", // Smooth cursor animation
        cursorStyle: "line", // Line cursor style
        cursorWidth: 2, // Make cursor more visible
        smoothScrolling: true,
        contextmenu: true,
        selectOnLineNumbers: true,
        roundedSelection: false,
        readOnly: false,
        automaticLayout: false,
        scrollBeyondLastLine: false,
        wordWrap: "on",
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: "on",
        folding: true,
        lineNumbersMinChars: 3,
        renderLineHighlight: "line",
        selectionHighlight: true,
        occurrencesHighlight: true,
        codeLens: false,
        mouseWheelZoom: false,
        fixedOverflowWidgets: false,
        renderValidationDecorations: "on",
        // Enhanced cursor and selection options
        cursorSurroundingLines: 3,
        cursorSurroundingLinesStyle: "default",
        renderWhitespace: "selection",
        renderControlCharacters: true,
        fontLigatures: true,
        // Disable all suggestion features
        suggest: {
          enabled: false,
        },
        quickSuggestions: false,
        parameterHints: {
          enabled: false,
        },
        autoClosingBrackets: "always",
        autoClosingQuotes: "always",
        autoSurround: "languageDefined",
        bracketPairColorization: {
          enabled: true,
        },
        guides: {
          bracketPairs: true,
          bracketPairsHorizontal: true,
          highlightActiveBracketPair: true,
          indentation: true,
        },
        hover: {
          enabled: false, // Disable hover as well
        },
        lightbulb: {
          enabled: false,
        },
      })

      // Initial layout with delay to ensure container is ready
      setTimeout(() => {
        if (isEditorMountedRef.current && editor && typeof editor.layout === "function") {
          try {
            if (containerRef.current) {
              const containerRect = containerRef.current.getBoundingClientRect()
              if (containerRect.width > 0) {
                editor.layout({
                  width: Math.floor(containerRect.width),
                  height: 400,
                })
              }
            }
          } catch (error) {
            console.debug("Initial layout error:", error.message)
          }
        }
      }, 100)

      // Setup controlled resize observer
      const handleResize = () => {
        if (isEditorMountedRef.current && !isLayoutInProgressRef.current) {
          // Use requestAnimationFrame to batch layout updates
          requestAnimationFrame(() => {
            if (isEditorMountedRef.current && !isLayoutInProgressRef.current) {
              forceLayout()
            }
          })
        }
      }

      // Create safe resize observer with debouncing
      resizeObserverRef.current = new SafeResizeObserver(handleResize)

      // Only observe the container, not the editor element itself
      if (containerRef.current) {
        resizeObserverRef.current.observe(containerRef.current)
      }

      // Handle editor disposal
      editor.onDidDispose(() => {
        isEditorMountedRef.current = false
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect()
        }
        if (layoutTimeoutRef.current) {
          clearTimeout(layoutTimeoutRef.current)
        }
      })
    },
    [forceLayout],
  )

  const handleEditorWillUnmount = useCallback(() => {
    isEditorMountedRef.current = false
    isLayoutInProgressRef.current = false
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect()
    }
    if (layoutTimeoutRef.current) {
      clearTimeout(layoutTimeoutRef.current)
    }
  }, [])

  // Controlled effect for prop changes
  useEffect(() => {
    // Only trigger layout for significant changes
    const timer = setTimeout(() => {
      if (!isLayoutInProgressRef.current) {
        forceLayout()
      }
    }, 200) // Increased delay to prevent rapid firing

    return () => clearTimeout(timer)
  }, [language, darkMode, forceLayout])

  // Controlled window resize handler
  useEffect(() => {
    let resizeTimeout

    const handleWindowResize = () => {
      // Clear previous timeout
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }

      // Debounce window resize events
      resizeTimeout = setTimeout(() => {
        if (!isLayoutInProgressRef.current) {
          forceLayout()
        }
      }, 150) // Debounce window resize
    }

    window.addEventListener("resize", handleWindowResize, { passive: true })

    return () => {
      window.removeEventListener("resize", handleWindowResize)
      if (resizeTimeout) {
        clearTimeout(resizeTimeout)
      }
    }
  }, [forceLayout])

  // Controlled visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !isLayoutInProgressRef.current) {
        // Delay layout when tab becomes visible
        setTimeout(() => {
          if (!isLayoutInProgressRef.current) {
            forceLayout()
          }
        }, 300)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [forceLayout])

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      isEditorMountedRef.current = false
      isLayoutInProgressRef.current = false
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current)
      }
    }
  }, [])

  const getMonacoLanguage = (lang) => {
    const languageMap = {
      python: "python",
      javascript: "javascript",
      java: "java",
      cpp: "cpp",
      c: "c",
      go: "go",
      rust: "rust",
      php: "php",
      ruby: "ruby",
      kotlin: "kotlin",
      swift: "swift",
    }
    return languageMap[lang] || "plaintext"
  }

  return (
    <div className="code-editor-container">
      {showActions && (
        <div className="code-editor-actions">
          <button className="editor-action-btn" onClick={copyCode} title="Copy code">
            ⧉
          </button>
          <button className="editor-action-btn" onClick={downloadCode} title="Download code">
            ↑
          </button>
        </div>
      )}
      <div className="code-editor" ref={containerRef}>
        <Editor
          height="400px"
          language={getMonacoLanguage(language)}
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          beforeUnmount={handleEditorWillUnmount}
          theme={darkMode ? "vs-dark" : "light"}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: false,
            tabSize: 2,
            wordWrap: "on",
            folding: true,
            lineNumbersMinChars: 3,
            scrollbar: {
              vertical: "visible",
              horizontal: "visible",
              useShadows: false,
              verticalHasArrows: false,
              horizontalHasArrows: false,
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: false,
            overviewRulerBorder: false,
            renderLineHighlight: "line",
            selectionHighlight: true,
            occurrencesHighlight: true,
            codeLens: false,
            contextmenu: true,
            mouseWheelZoom: false,
            smoothScrolling: true,
            cursorBlinking: "blink",
            cursorSmoothCaretAnimation: "on",
            cursorStyle: "line",
            cursorWidth: 2,
            selectOnLineNumbers: true,
            readOnly: false,
            fixedOverflowWidgets: false,
            renderValidationDecorations: "on",
            // Disable all suggestion features
            suggest: {
              enabled: false,
            },
            quickSuggestions: false,
            parameterHints: { enabled: false },
            hover: { enabled: false },
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
            lightbulb: { enabled: false },
          }}
        />
      </div>
    </div>
  )
}

export default CodeEditor
