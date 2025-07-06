"use client"

const PromptTemplates = ({ onTemplateSelect }) => {
  const templates = [
    "Create a function to sort an array",
    "Build a REST API endpoint",
    "Implement a binary search algorithm",
    "Create a class for data validation",
    "Write a function to reverse a string",
    "Build a simple calculator",
    "Create a file reader utility",
    "Implement a hash table",
  ]

  return (
    <div className="prompt-templates">
      <h4 className="templates-title">Quick Templates:</h4>
      <div className="templates-grid">
        {templates.map((template, index) => (
          <button key={index} className="template-btn" onClick={() => onTemplateSelect(template)}>
            {template}
          </button>
        ))}
      </div>
    </div>
  )
}

export default PromptTemplates
