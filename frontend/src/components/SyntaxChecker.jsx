"use client"

const SyntaxChecker = ({ errors }) => {
  // Don't render anything if no errors
  if (!errors || errors.length === 0) {
    return null
  }

  return (
    <div className="syntax-checker">
      <h4 className="syntax-checker-title">
        <span>⚠️</span> Syntax Issues ({errors.length})
      </h4>
      <div className="syntax-errors">
        {errors.map((error, index) => (
          <div key={index} className={`syntax-error ${error.severity}`}>
            <span className="error-line">Line {error.line}:</span>
            <span className="error-message">{error.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SyntaxChecker
