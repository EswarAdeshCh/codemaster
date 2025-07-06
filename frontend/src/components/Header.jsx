"use client"
// import logo from '../styles/logo.png';
const Header = ({ darkMode, setDarkMode }) => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
{/* <span className="logo-icon">
      <img src={logo} alt="logo" style={{ width: '40px', height: '40px' }} />
    </span>    */}
    <span className="logo-icon">🧠</span>
          <h1>CodeMaster</h1>
        </div>

        <div className="header-actions">
          <button
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
            title={`Switch to ${darkMode ? "light" : "dark"} mode`}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
