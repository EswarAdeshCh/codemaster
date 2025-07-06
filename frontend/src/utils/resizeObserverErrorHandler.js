// Global ResizeObserver error handler utility
let resizeObserverErrorSuppressed = false

export const suppressResizeObserverError = () => {
  if (resizeObserverErrorSuppressed) return

  // Suppress ResizeObserver errors globally
  const originalError = window.console.error
  window.console.error = (...args) => {
    const errorMessage = args[0]

    // Check for ResizeObserver related errors
    if (
      errorMessage &&
      ((typeof errorMessage === "string" &&
        (errorMessage.includes("ResizeObserver") ||
          errorMessage.includes("undelivered notifications") ||
          errorMessage.includes("ResizeObserver loop"))) ||
        (errorMessage.message &&
          (errorMessage.message.includes("ResizeObserver") ||
            errorMessage.message.includes("undelivered notifications") ||
            errorMessage.message.includes("ResizeObserver loop"))) ||
        (errorMessage.toString &&
          (errorMessage.toString().includes("ResizeObserver") ||
            errorMessage.toString().includes("undelivered notifications") ||
            errorMessage.toString().includes("ResizeObserver loop"))))
    ) {
      return // Suppress ResizeObserver errors
    }

    // Allow all other errors through
    originalError.apply(console, args)
  }

  // Handle unhandled errors
  const originalErrorHandler = window.onerror
  window.onerror = (message, source, lineno, colno, error) => {
    if (
      message &&
      (message.includes("ResizeObserver") ||
        message.includes("undelivered notifications") ||
        message.includes("ResizeObserver loop"))
    ) {
      return true // Prevent default error handling
    }
    if (originalErrorHandler) {
      return originalErrorHandler(message, source, lineno, colno, error)
    }
    return false
  }

  // Handle unhandled promise rejections
  const originalUnhandledRejection = window.onunhandledrejection
  window.onunhandledrejection = (event) => {
    if (
      event.reason &&
      ((event.reason.message &&
        (event.reason.message.includes("ResizeObserver") ||
          event.reason.message.includes("undelivered notifications") ||
          event.reason.message.includes("ResizeObserver loop"))) ||
        (event.reason.toString &&
          (event.reason.toString().includes("ResizeObserver") ||
            event.reason.toString().includes("undelivered notifications") ||
            event.reason.toString().includes("ResizeObserver loop"))))
    ) {
      event.preventDefault()
      return
    }
    if (originalUnhandledRejection) {
      originalUnhandledRejection(event)
    }
  }

  resizeObserverErrorSuppressed = true
}

// Enhanced SafeResizeObserver with better debouncing
export class SafeResizeObserver {
  constructor(callback) {
    this.callback = callback
    this.observer = null
    this.timeoutId = null
    this.isObserving = false
    this.isDestroyed = false
    this.lastCallTime = 0
    this.minInterval = 50 // Minimum 50ms between calls
  }

  observe(element) {
    if (this.isObserving || this.isDestroyed || !element) return

    try {
      this.observer = new ResizeObserver((entries) => {
        // Check if observer is still valid
        if (this.isDestroyed) return

        const now = Date.now()
        const timeSinceLastCall = now - this.lastCallTime

        // Clear any pending timeout
        if (this.timeoutId) {
          clearTimeout(this.timeoutId)
        }

        // Debounce with minimum interval
        const delay = Math.max(0, this.minInterval - timeSinceLastCall)

        this.timeoutId = setTimeout(() => {
          if (this.isDestroyed) return

          try {
            // Validate entries before calling callback
            if (entries && entries.length > 0 && typeof this.callback === "function") {
              this.lastCallTime = Date.now()
              this.callback(entries)
            }
          } catch (error) {
            // Only log non-ResizeObserver errors
            if (
              !error.message?.includes("ResizeObserver") &&
              !error.message?.includes("undelivered notifications") &&
              !error.message?.includes("isDisposed") &&
              !error.message?.includes("layout")
            ) {
              console.warn("Resize callback error:", error.message)
            }
          }
        }, delay)
      })

      this.observer.observe(element)
      this.isObserving = true
    } catch (error) {
      // Only log critical errors
      if (!error.message?.includes("ResizeObserver")) {
        console.warn("ResizeObserver creation error:", error.message)
      }
    }
  }

  disconnect() {
    this.isDestroyed = true

    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }

    if (this.observer) {
      try {
        this.observer.disconnect()
      } catch (error) {
        // Ignore disconnect errors silently
      }
      this.observer = null
    }

    this.isObserving = false
  }

  // Method to check if observer is still active
  isActive() {
    return this.isObserving && !this.isDestroyed && this.observer !== null
  }
}

// Utility function to safely check if an element exists and is connected
export const isElementValid = (element) => {
  return element && element.nodeType === Node.ELEMENT_NODE && element.isConnected !== false
}

// Utility function to safely perform DOM operations
export const safeDOMOperation = (operation, fallback = null) => {
  try {
    return operation()
  } catch (error) {
    if (!error.message?.includes("ResizeObserver") && !error.message?.includes("undelivered notifications")) {
      console.debug("DOM operation failed:", error.message)
    }
    return fallback
  }
}
