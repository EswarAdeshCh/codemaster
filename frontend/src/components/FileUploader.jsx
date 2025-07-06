"use client"

import { useRef } from "react"

const FileUploader = ({ onFileUpload }) => {
  const fileInputRef = useRef(null)

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        onFileUpload(e.target.result)
      }
      reader.readAsText(file)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="file-uploader">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".py,.js,.java,.cpp,.c,.go,.rs,.php,.rb,.kt,.swift,.txt"
        style={{ display: "none" }}
      />
      <button className="btn btn-secondary" onClick={handleClick}>
        <span>📁</span> Upload File
      </button>
    </div>
  )
}

export default FileUploader
