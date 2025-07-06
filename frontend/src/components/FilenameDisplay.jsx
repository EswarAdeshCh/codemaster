"use client"

import { useState } from "react"

const FilenameDisplay = ({ filename, language, onFilenameChange }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(filename)

  const getLanguageIcon = (lang) => {
    const icons = {
      java: "☕",
      kotlin: "🎯",
      swift: "🍎",
      python: "🐍",
      javascript: "🟨",
      cpp: "⚡",
      c: "🔧",
      go: "🐹",
      rust: "🦀",
      php: "🐘",
      ruby: "💎",
    }
    return icons[lang] || "📄"
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditValue(filename)
  }

  const handleSave = () => {
    if (editValue.trim() && editValue !== filename) {
      onFilenameChange(editValue.trim())
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(filename)
    setIsEditing(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  if (!filename) {
    return null
  }

  return (
    <div className="filename-display">
      <span className="filename-icon">{getLanguageIcon(language)}</span>
      {isEditing ? (
        <div className="filename-edit">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={handleSave}
            className="filename-input"
            autoFocus
          />
        </div>
      ) : (
        <div className="filename-content">
          <span className="filename-text" onClick={handleEdit} title="Click to edit filename">
            {filename}
          </span>
          <button className="filename-edit-btn" onClick={handleEdit} title="Edit filename">
            ✏️
          </button>
        </div>
      )}
    </div>
  )
}

export default FilenameDisplay
