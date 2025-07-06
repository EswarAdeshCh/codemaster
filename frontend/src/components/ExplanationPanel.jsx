"use client"
import { useEffect, useRef } from "react"
import { SafeResizeObserver } from "../utils/resizeObserverErrorHandler"

const ExplanationPanel = ({ explanation }) => {
  const explanationRef = useRef(null)
  const resizeObserverRef = useRef(null)

  useEffect(() => {
    const handleResize = () => {
      if (explanationRef.current) {
        requestAnimationFrame(() => {
          if (explanationRef.current) {
            // Auto-adjust height based on content
            const scrollHeight = explanationRef.current.scrollHeight
            if (scrollHeight > 400) {
              explanationRef.current.style.maxHeight = "400px"
              explanationRef.current.style.overflowY = "auto"
            } else {
              explanationRef.current.style.maxHeight = "none"
              explanationRef.current.style.overflowY = "visible"
            }
          }
        })
      }
    }

    resizeObserverRef.current = new SafeResizeObserver(handleResize)

    if (explanationRef.current) {
      resizeObserverRef.current.observe(explanationRef.current)
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
    }
  }, [])

  return (
    <div className="explanation-panel" ref={explanationRef}>
      <div className="explanation-content">
        {explanation.split("\n").map((line, index) => (
          <p key={index} className="explanation-line">
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}

export default ExplanationPanel
