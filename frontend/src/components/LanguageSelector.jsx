"use client"

const LanguageSelector = ({ language, setLanguage }) => {
  const languages = [
    { value: "python", label: "Python", icon: "🐍" },
    { value: "javascript", label: "JavaScript", icon: "🟨" },
    { value: "java", label: "Java", icon: "☕" },
    { value: "cpp", label: "C++", icon: "⚡" },
    { value: "c", label: "C", icon: "🔧" },
    { value: "go", label: "Go", icon: "🐹" },
    { value: "rust", label: "Rust", icon: "🦀" },
    { value: "php", label: "PHP", icon: "🐘" },
    { value: "ruby", label: "Ruby", icon: "💎" },
    { value: "kotlin", label: "Kotlin", icon: "🎯" },
    { value: "swift", label: "Swift", icon: "🍎" },
  ]

  return (
    <div className="language-selector">
      <select value={language} onChange={(e) => setLanguage(e.target.value)} className="language-select">
        {languages.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.icon} {lang.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default LanguageSelector
