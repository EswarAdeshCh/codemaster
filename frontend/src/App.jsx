"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { Toaster, toast } from "react-hot-toast"
import "./styles/App.css"

// Import components
import Header from "./components/Header"
import CodeEditor from "./components/CodeEditor"
import OutputPanel from "./components/OutputPanel"
import LanguageSelector from "./components/LanguageSelector"
import FileUploader from "./components/FileUploader"
import ExplanationPanel from "./components/ExplanationPanel"
import SyntaxChecker from "./components/SyntaxChecker"
import PromptTemplates from "./components/PromptTemplates"
import TranslateCode from "./components/TranslateCode"
import OptimizeCode from "./components/OptimizeCode"
import GenerateTests from "./components/GenerateTests"
import FilenameDisplay from "./components/FilenameDisplay"

// Language templates with proper naming conventions
const LANGUAGE_TEMPLATES = {
  python: `# Write your Python code here
print("Hello from Python!")`,

  javascript: `// Write your JavaScript code here
console.log("Hello from JavaScript!");`,

  java: `// Write your Java code here
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
    }
}`,

  cpp: `// Write your C++ code here
#include <iostream>
using namespace std;

int main() {
    cout << "Hello from C++!" << endl;
    return 0;
}`,

  c: `// Write your C code here
#include <stdio.h>

int main() {
    printf("Hello from C!\\n");
    return 0;
}`,

  go: `// Write your Go code here
package main

import "fmt"

func main() {
    fmt.Println("Hello from Go!")
}`,

  rust: `// Write your Rust code here
fn main() {
    println!("Hello from Rust!");
}`,

  php: `<?php
// Write your PHP code here
echo "Hello from PHP!";
?>`,

  ruby: `# Write your Ruby code here
puts "Hello from Ruby!"`,

  kotlin: `// Write your Kotlin code here
class Main {
    companion object {
        @JvmStatic
        fun main(args: Array<String>) {
            println("Hello from Kotlin!")
        }
    }
}`,

  swift: `// Write your Swift code here
print("Hello from Swift!")`,
}

function App() {
  const [language, setLanguage] = useState("python")
  const [code, setCode] = useState(LANGUAGE_TEMPLATES.python)
  const [output, setOutput] = useState("")
  const [explanation, setExplanation] = useState("")
  const [loading, setLoading] = useState(false)
  const [promptInput, setPromptInput] = useState("")
  const [syntaxErrors, setSyntaxErrors] = useState([])
  const [darkMode, setDarkMode] = useState(true)
  const [activeTab, setActiveTab] = useState("code")
  const [translatedCode, setTranslatedCode] = useState("")
  const [targetLanguage, setTargetLanguage] = useState("javascript")
  const [optimizedCode, setOptimizedCode] = useState("")
  const [testCode, setTestCode] = useState("")
  const [userHasWrittenCode, setUserHasWrittenCode] = useState(false)
  const [currentFilename, setCurrentFilename] = useState("")
  const [customFilename, setCustomFilename] = useState("")

  // Backend URL
  const BACKEND_URL = process.env.REACT_APP_PUBLIC_BACKEND_URL;

  // Apply theme
  useEffect(() => {
    document.body.className = darkMode ? "dark" : "light"
  }, [darkMode])

  // Listen for custom toast events
  useEffect(() => {
    const handleToast = (event) => {
      const { message, type } = event.detail
      if (type === "success") {
        toast.success(message)
      } else if (type === "error") {
        toast.error(message)
      } else {
        toast(message)
      }
    }

    window.addEventListener("showToast", handleToast)
    return () => window.removeEventListener("showToast", handleToast)
  }, [])

  // Force layout recalculation when tab changes
  const triggerLayoutRecalculation = useCallback(() => {
    // Trigger a window resize event to force Monaco editors to recalculate
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"))
    }, 100)
  }, [])

  // Update filename when code changes
  const updateFilename = useCallback(
    async (newCode, lang) => {
      if (!newCode.trim()) {
        setCurrentFilename("")
        return
      }

      try {
        const response = await axios.post(`${BACKEND_URL}/get-filename`, {
          code: newCode,
          language: lang,
        })
        setCurrentFilename(response.data.filename)
      } catch (error) {
        console.error("Failed to get filename:", error)
        setCurrentFilename("")
      }
    },
    [BACKEND_URL],
  )

  // Handle language change
  const handleLanguageChange = (newLanguage) => {
    const currentTemplate = LANGUAGE_TEMPLATES[language]
    const isCurrentlyTemplate = code.trim() === currentTemplate.trim()

    if (!userHasWrittenCode || isCurrentlyTemplate) {
      setCode(LANGUAGE_TEMPLATES[newLanguage])
      setUserHasWrittenCode(false)
      updateFilename(LANGUAGE_TEMPLATES[newLanguage], newLanguage)
    } else {
      updateFilename(code, newLanguage)
    }

    setLanguage(newLanguage)
    setSyntaxErrors([]) // Clear syntax errors when language changes
    setCustomFilename("") // Reset custom filename

    // Trigger layout recalculation after language change
    triggerLayoutRecalculation()
  }

  // Handle code changes
  const handleCodeChange = (newCode) => {
    setCode(newCode)
    const template = LANGUAGE_TEMPLATES[language]
    const hasWritten = newCode.trim() !== template.trim() && newCode.trim() !== ""
    setUserHasWrittenCode(hasWritten)

    // Update filename when code changes (only if no custom filename is set)
    if (!customFilename) {
      updateFilename(newCode, language)
    }
  }

  // Handle filename change
  const handleFilenameChange = (newFilename) => {
    setCustomFilename(newFilename)
    setCurrentFilename(newFilename)
  }

  // Run code
  const runCode = async () => {
    if (!code.trim()) {
      toast.error("Please enter some code to run")
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${BACKEND_URL}/run`, {
        code,
        language,
        input: "",
        filename: customFilename || currentFilename, // Use custom filename if set
      })

      const result = response.data
      setOutput(result.output)

      if (result.success) {
        const filenameInfo = result.filename ? ` (${result.filename})` : ""
        toast.success(`Code executed successfully! ${filenameInfo} (${result.execution_time})`)
      } else if (result.runtime_input_detected) {
        toast.error("Runtime input detected")
      } else {
        toast.error("Code execution failed")
      }
    } catch (error) {
      console.error("Code execution error:", error)
      setOutput(`Error: ${error.response?.data?.detail || error.message}`)
      toast.error("Code execution failed")
    }
    setLoading(false)
  }

  // Generate code
  const generateCode = async () => {
    if (!promptInput.trim()) {
      toast.error("Please enter a prompt")
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${BACKEND_URL}/generate`, {
        prompt: promptInput,
        language,
        mode: "code-generation",
      })

      if (response.data.generatedCode) {
        setCode(response.data.generatedCode)
        setUserHasWrittenCode(true)
        setExplanation(response.data.explanation || "")

        // Update filename from generated code
        if (response.data.filename) {
          setCurrentFilename(response.data.filename)
          setCustomFilename("") // Reset custom filename
        } else {
          updateFilename(response.data.generatedCode, language)
        }

        toast.success("Code generated successfully!")
        triggerLayoutRecalculation()
      } else {
        throw new Error("No code was generated")
      }
    } catch (error) {
      console.error("Code generation error:", error)
      toast.error("Code generation failed: " + (error.response?.data?.detail || error.message))
      setExplanation(`Error: ${error.response?.data?.detail || error.message}`)
    }
    setLoading(false)
  }

  // Explain code
  const explainCode = async () => {
    if (!code.trim()) {
      toast.error("Please enter some code to explain")
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${BACKEND_URL}/explain`, {
        code,
        language,
      })

      if (response.data.explanation) {
        setExplanation(response.data.explanation)
        toast.success("Code explained successfully!")
      } else {
        throw new Error("No explanation was generated")
      }
    } catch (error) {
      console.error("Code explanation error:", error)
      toast.error("Code explanation failed: " + (error.response?.data?.detail || error.message))
      setExplanation(`Error: ${error.response?.data?.detail || error.message}`)
    }
    setLoading(false)
  }

  // Enhanced syntax check with proper error clearing
  const checkSyntax = async () => {
    if (!code.trim()) {
      setSyntaxErrors([]) // Clear errors if no code
      return
    }

    try {
      const response = await axios.post(`${BACKEND_URL}/syntax-check`, {
        code,
        language,
      })

      // Handle the response properly
      if (response.data && response.data.errors) {
        setSyntaxErrors(response.data.errors)
      } else {
        // If no errors property or empty response, clear errors
        setSyntaxErrors([])
      }
    } catch (error) {
      console.error("Syntax check failed:", error)
      // On error, show a generic syntax check failure message
      setSyntaxErrors([
        {
          line: 1,
          message: "Syntax check temporarily unavailable",
          severity: "warning",
        },
      ])
    }
  }

  // Translate code
  const translateCode = async () => {
    if (!code.trim()) {
      toast.error("Please enter some code to translate")
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${BACKEND_URL}/translate`, {
        code,
        source_language: language,
        target_language: targetLanguage,
      })

      if (response.data.translatedCode) {
        setTranslatedCode(response.data.translatedCode)
        setExplanation(response.data.explanation || "")
        toast.success(`Code translated from ${language} to ${targetLanguage}!`)
        triggerLayoutRecalculation()
      } else {
        throw new Error("No translation was generated")
      }
    } catch (error) {
      console.error("Code translation error:", error)
      toast.error("Code translation failed: " + (error.response?.data?.detail || error.message))
      setExplanation(`Error: ${error.response?.data?.detail || error.message}`)
    }
    setLoading(false)
  }

  // Optimize code
  const optimizeCode = async () => {
    if (!code.trim()) {
      toast.error("Please enter some code to optimize")
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${BACKEND_URL}/optimize`, {
        code,
        language,
      })

      if (response.data.optimizedCode) {
        setOptimizedCode(response.data.optimizedCode)
        setExplanation(response.data.explanation || "")
        toast.success("Code optimized successfully!")
        triggerLayoutRecalculation()
      } else {
        throw new Error("No optimization was generated")
      }
    } catch (error) {
      console.error("Code optimization error:", error)
      toast.error("Code optimization failed: " + (error.response?.data?.detail || error.message))
      setExplanation(`Error: ${error.response?.data?.detail || error.message}`)
    }
    setLoading(false)
  }

  // Generate tests
  const generateTests = async () => {
    if (!code.trim()) {
      toast.error("Please enter some code to generate tests for")
      return
    }

    setLoading(true)
    try {
      const response = await axios.post(`${BACKEND_URL}/generate-tests`, {
        code,
        language,
      })

      if (response.data.testCode) {
        setTestCode(response.data.testCode)
        setExplanation(response.data.explanation || "")
        toast.success("Test cases generated successfully!")
        triggerLayoutRecalculation()
      } else {
        throw new Error("No test cases were generated")
      }
    } catch (error) {
      console.error("Test generation error:", error)
      toast.error("Test generation failed: " + (error.response?.data?.detail || error.message))
      setExplanation(`Error: ${error.response?.data?.detail || error.message}`)
    }
    setLoading(false)
  }

  // Handle file upload
  const handleFileUpload = (fileContent) => {
    setCode(fileContent)
    setUserHasWrittenCode(true)
    setCustomFilename("") // Reset custom filename to auto-detect
    updateFilename(fileContent, language)
    toast.success("File uploaded successfully!")
    triggerLayoutRecalculation()
  }

  // Handle template selection
  const handleTemplateSelect = (template) => {
    setPromptInput(template)
  }

  // Enhanced auto syntax check with proper debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (code.trim() && userHasWrittenCode) {
        checkSyntax()
      } else if (!code.trim()) {
        // Clear errors if code is empty
        setSyntaxErrors([])
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [code, language, userHasWrittenCode])

  // Clear syntax errors when switching languages or tabs
  useEffect(() => {
    setSyntaxErrors([])
  }, [language, activeTab])

  // Update filename on initial load
  useEffect(() => {
    updateFilename(code, language)
  }, [])

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setTranslatedCode("")
    setOptimizedCode("")
    setTestCode("")
    setExplanation("")

    // Trigger layout recalculation when switching tabs
    triggerLayoutRecalculation()
  }

  // Effect to handle window focus (when returning to tab)
  useEffect(() => {
    const handleFocus = () => {
      triggerLayoutRecalculation()
    }

    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [triggerLayoutRecalculation])

  return (
    <div className="app-container">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: "12px",
            padding: "16px",
            fontSize: "14px",
            fontWeight: "500",
          },
        }}
      />

      <Header darkMode={darkMode} setDarkMode={setDarkMode} />

      <div className="glass-container">
        <div className="tabs">
          <button className={`tab ${activeTab === "code" ? "active" : ""}`} onClick={() => handleTabChange("code")}>
            <span>💻</span> Code
          </button>
          <button
            className={`tab ${activeTab === "translate" ? "active" : ""}`}
            onClick={() => handleTabChange("translate")}
          >
            <span>🔄</span> Translate
          </button>
          <button
            className={`tab ${activeTab === "optimize" ? "active" : ""}`}
            onClick={() => handleTabChange("optimize")}
          >
            <span>⚡</span> Optimize
          </button>
          <button className={`tab ${activeTab === "tests" ? "active" : ""}`} onClick={() => handleTabChange("tests")}>
            <span>🧪</span> Tests
          </button>
        </div>

        <div className="controls-section">
          <LanguageSelector language={language} setLanguage={handleLanguageChange} />
          <FilenameDisplay filename={currentFilename} language={language} onFilenameChange={handleFilenameChange} />
          <FileUploader onFileUpload={handleFileUpload} />
          <button className="btn btn-primary" onClick={runCode} disabled={loading}>
            {loading ? (
              <>
                <span className="loading-spinner"></span> Running...
              </>
            ) : (
              <>
                <span>▶️</span> Run Code
              </>
            )}
          </button>
          <button className="btn btn-secondary" onClick={explainCode} disabled={loading}>
            {loading ? (
              <>
                <span className="loading-spinner"></span> Explaining...
              </>
            ) : (
              <>
                <span>💡</span> Explain
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "code" && (
        <>
          <div className="main-layout">
            <div className="left-panel">
              <div className="glass-container">
                <h3 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>
                  <span style={{ marginRight: "8px" }}>💻</span>
                  Code Editor
                </h3>
                <CodeEditor
                  language={language}
                  code={code}
                  onChange={handleCodeChange}
                  darkMode={darkMode}
                  filename={currentFilename}
                />
                <SyntaxChecker errors={syntaxErrors} />
              </div>
            </div>

            <div className="right-panel">
              <div className="glass-container" style={{ height: "100%" }}>
                <h3 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>
                  <span style={{ marginRight: "8px" }}>📤</span>
                  Output
                </h3>
                <OutputPanel output={output} />
              </div>

              <div className="glass-container" style={{ height: "100%" }}>
                <h3 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>
                  <span style={{ marginRight: "8px" }}>🤖</span>
                  AI Assistant
                </h3>
                <PromptTemplates onTemplateSelect={handleTemplateSelect} />
                <textarea
                  className="prompt-textarea"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Describe what you want to build... (e.g., 'Create a Calculator class', 'Build a REST API endpoint', etc.)"
                  rows={4}
                />
                <button
                  className="btn btn-primary"
                  onClick={generateCode}
                  disabled={loading}
                  style={{ marginTop: "12px", width: "100%" }}
                >
                  {loading ? (
                    <>
                      <span className="loading-spinner"></span> Generating...
                    </>
                  ) : (
                    <>
                      <span>✨</span> Generate Code
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Full Width AI Explanation */}
          {explanation && (
            <div className="glass-container">
              <h3 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>
                <span style={{ marginRight: "8px" }}>🧠</span>
                AI Explanation
              </h3>
              <ExplanationPanel explanation={explanation} />
            </div>
          )}
        </>
      )}

      {/* Feature Panels for other tabs */}
      {activeTab === "translate" && (
        <>
          <TranslateCode
            code={code}
            language={language}
            targetLanguage={targetLanguage}
            setTargetLanguage={setTargetLanguage}
            translatedCode={translatedCode}
            onTranslate={translateCode}
            loading={loading}
            darkMode={darkMode}
          />
          {explanation && (
            <div className="glass-container">
              <h3 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>
                <span style={{ marginRight: "8px" }}>🧠</span>
                Translation Explanation
              </h3>
              <ExplanationPanel explanation={explanation} />
            </div>
          )}
        </>
      )}

      {activeTab === "optimize" && (
        <>
          <OptimizeCode
            code={code}
            language={language}
            optimizedCode={optimizedCode}
            onOptimize={optimizeCode}
            loading={loading}
            darkMode={darkMode}
          />
          {explanation && (
            <div className="glass-container">
              <h3 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>
                <span style={{ marginRight: "8px" }}>🧠</span>
                Optimization Explanation
              </h3>
              <ExplanationPanel explanation={explanation} />
            </div>
          )}
        </>
      )}

      {activeTab === "tests" && (
        <>
          <GenerateTests
            code={code}
            language={language}
            testCode={testCode}
            onGenerateTests={generateTests}
            loading={loading}
            darkMode={darkMode}
          />
          {explanation && (
            <div className="glass-container">
              <h3 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>
                <span style={{ marginRight: "8px" }}>🧠</span>
                Test Generation Explanation
              </h3>
              <ExplanationPanel explanation={explanation} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default App
