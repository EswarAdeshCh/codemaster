"use client"
import { useEffect, useRef } from "react"
import { SafeResizeObserver } from "../utils/resizeObserverErrorHandler"

const OutputPanel = ({ output }) => {
  const outputRef = useRef(null)
  const resizeObserverRef = useRef(null)

  useEffect(() => {
    const handleResize = () => {
      if (outputRef.current) {
        requestAnimationFrame(() => {
          if (outputRef.current) {
            // Scroll to bottom when resized
            outputRef.current.scrollTop = outputRef.current.scrollHeight
          }
        })
      }
    }

    resizeObserverRef.current = new SafeResizeObserver(handleResize)

    if (outputRef.current) {
      resizeObserverRef.current.observe(outputRef.current)
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
    }
  }, [])

  useEffect(() => {
    // Scroll to bottom when output changes
    if (outputRef.current) {
      requestAnimationFrame(() => {
        if (outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight
        }
      })
    }
  }, [output])

  return (
    <div className="output-panel" ref={outputRef}>
      <pre className="output-content">{output || "No output yet. Run your code to see results here."}</pre>
    </div>
  )
}

export default OutputPanel
