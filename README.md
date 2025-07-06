# CodeMaster - Online Code Editor

CodeMaster is a full-stack online code editor that allows users to write, execute, and debug code in multiple programming languages. It features a React-based frontend and a FastAPI-based backend, integrating with external APIs for code execution (Judge0) and AI-powered functionalities (Groq).

## Features

- **Multi-language Support**: Write and execute code in Python, JavaScript, Java, C++, C, Go, Rust, PHP, Ruby, Kotlin, and Swift.
- **Real-time Code Execution**: Run your code and view the output directly in the browser.
- **AI-Powered Features (via Groq)**:
    - **Code Explanation**: Get explanations for your code.
    - **Syntax Checking**: Identify and fix syntax errors.
    - **Code Translation**: Translate code between supported languages.
    - **Code Optimization**: Receive suggestions for optimizing your code.
    - **Test Generation**: Generate test cases for your code.
- **File Management**: Upload code files and manage them within the editor.
- **Dark/Light Mode**: Toggle between dark and light themes.
- **Dynamic Filename Display**: Automatically suggests filenames based on code content.

## Technologies Used

### Frontend

- **React**: A JavaScript library for building user interfaces.
- **Axios**: Promise-based HTTP client for the browser and Node.js.
- **React Hot Toast**: Declarative and accessible toast notifications.
- **Monaco Editor**: The code editor that powers VS Code.
- **HTML/CSS**: For structuring and styling the web application.

### Backend

- **FastAPI**: A modern, fast (high-performance) web framework for building APIs with Python 3.7+ based on standard Python type hints.
- **Uvicorn**: An ASGI server for Python.
- **python-dotenv**: Reads key-value pairs from a `.env` file and sets them as environment variables.
- **httpx**: A fully featured HTTP client for Python 3, which provides sync and async APIs.
- **Pydantic**: Data validation and settings management using Python type hints.
- **python-multipart**: For handling form data, including file uploads.

### External APIs

- **Judge0 API**: For compiling and executing code in various programming languages.
- **Groq API**: For AI-powered features like code explanation, translation, and optimization.

## Setup and Installation

To set up the project locally, follow these steps:

### 1. Clone the Repository

```bash
git clone https://github.com/EswarAdeshCh/codemaster.git
cd codemaster
```

### 2. Backend Setup

Navigate to the `backend` directory:

```bash
cd backend
```

Create a virtual environment and install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory and add your API keys and configurations:

```env
JUDGE0_API_URL="YOUR_JUDGE0_API_URL"
JUDGE0_API_KEY="YOUR_JUDGE0_API_KEY"
JUDGE0_HOST="YOUR_JUDGE0_HOST"
GROQ_API_KEY="YOUR_GROQ_API_KEY"
GROQ_MODEL="YOUR_GROQ_MODEL_NAME" # e.g., "llama3-8b-8192"
GROQ_API_URL="YOUR_GROQ_API_URL"
```

Run the backend server:

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup

Navigate to the `frontend` directory:

```bash
cd ../frontend
```

Install Node.js dependencies:

```bash
npm install
```

Create a `.env` file in the `frontend` directory and add your backend URL:

```env
REACT_APP_PUBLIC_BACKEND_URL="http://localhost:8000"
```

Run the frontend development server:

```bash
npm start
```

The application should now be running and accessible in your browser, typically at `http://localhost:3000`.