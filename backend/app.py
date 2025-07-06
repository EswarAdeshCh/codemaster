from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import httpx
import asyncio
import base64
import os
import logging
import re
import tempfile
import shutil
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create temporary directory for the application
TEMP_DIR = tempfile.mkdtemp(prefix="codemaster_")
LOG_DIR = os.path.join(TEMP_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)

# Configure logging to use temp directory
logging.basicConfig(
    level=logging.WARNING,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, "codemaster.log")),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Judge0 Configuration
JUDGE0_API_URL = os.getenv("JUDGE0_API_URL")
JUDGE0_API_KEY = os.getenv("JUDGE0_API_KEY")
JUDGE0_HOST = os.getenv("JUDGE0_HOST")

# Groq Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL")
GROQ_API_URL = os.getenv("GROQ_API_URL")

# Judge0 Language IDs mapping
JUDGE0_LANGUAGE_IDS = {
    "python": 71,
    "javascript": 63,
    "java": 62,
    "cpp": 54,
    "c": 50,
    "go": 60,
    "rust": 73,
    "php": 68,
    "ruby": 72,
    "kotlin": 78,
    "swift": 83,
}

# Language configurations with filename patterns
LANGUAGE_CONFIGS = {
    "python": {"extension": "py", "timeout": 10, "default_name": "main"},
    "javascript": {"extension": "js", "timeout": 10, "default_name": "main"},
    "java": {"extension": "java", "timeout": 15, "default_name": "Main"},
    "cpp": {"extension": "cpp", "timeout": 15, "default_name": "main"},
    "c": {"extension": "c", "timeout": 15, "default_name": "main"},
    "go": {"extension": "go", "timeout": 15, "default_name": "main"},
    "rust": {"extension": "rs", "timeout": 20, "default_name": "main"},
    "php": {"extension": "php", "timeout": 10, "default_name": "main"},
    "ruby": {"extension": "rb", "timeout": 10, "default_name": "main"},
    "kotlin": {"extension": "kt", "timeout": 20, "default_name": "Main"},
    "swift": {"extension": "swift", "timeout": 15, "default_name": "main"},
}

# Runtime input detection patterns
RUNTIME_INPUT_PATTERNS = {
    "python": [r'input\s*\(', r'sys\.stdin\.read', r'raw_input\s*\('],
    "javascript": [r'prompt\s*\(', r'readline\s*\(', r'process\.stdin'],
    "java": [r'Scanner\s*\(', r'System\.in', r'BufferedReader'],
    "cpp": [r'cin\s*>>', r'getline\s*\(', r'scanf\s*\('],
    "c": [r'scanf\s*\(', r'getchar\s*\(', r'fgets\s*\(', r'gets\s*\('],
    "go": [r'fmt\.Scan', r'bufio\.NewScanner', r'os\.Stdin'],
    "rust": [r'stdin\s*\(', r'read_line', r'io::stdin'],
    "php": [r'fgets\s*\(', r'readline\s*\(', r'STDIN'],
    "ruby": [r'gets\s*', r'STDIN\.read', r'readline'],
    "kotlin": [r'readLine\s*\(', r'Scanner\s*\(', r'System\.`in`'],
    "swift": [r'readLine\s*\(', r'FileHandle\.standardInput'],
}

def create_temp_file(content: str, filename: str) -> str:
    """Create a temporary file with the given content and return its path."""
    temp_file_dir = os.path.join(TEMP_DIR, "files")
    os.makedirs(temp_file_dir, exist_ok=True)
    
    temp_file_path = os.path.join(temp_file_dir, filename)
    
    try:
        with open(temp_file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return temp_file_path
    except Exception as e:
        logger.error(f"Failed to create temp file {filename}: {str(e)}")
        raise

def cleanup_temp_file(file_path: str):
    """Safely remove a temporary file."""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        logger.warning(f"Failed to cleanup temp file {file_path}: {str(e)}")

def extract_filename_from_code(code, language):
    """Extract appropriate filename from code based on language-specific patterns."""
    
    if language == "java":
        # Look for public class declaration first (most important for Java)
        public_class_match = re.search(r'public\s+class\s+(\w+)', code, re.IGNORECASE)
        if public_class_match:
            class_name = public_class_match.group(1)
            # Ensure the class name is properly capitalized
            return class_name[0].upper() + class_name[1:] if class_name else "Main"
        
        # Look for any class declaration
        class_match = re.search(r'class\s+(\w+)', code, re.IGNORECASE)
        if class_match:
            class_name = class_match.group(1)
            return class_name[0].upper() + class_name[1:] if class_name else "Main"
        
        # If no class found, check for main method and use default
        if re.search(r'public\s+static\s+void\s+main', code, re.IGNORECASE):
            return "Main"
    
    elif language == "kotlin":
        # Look for class declaration
        class_match = re.search(r'class\s+(\w+)', code, re.IGNORECASE)
        if class_match:
            return class_match.group(1)
        
        # Look for main function in object
        object_match = re.search(r'object\s+(\w+)', code, re.IGNORECASE)
        if object_match:
            return object_match.group(1)
    
    elif language == "swift":
        # Look for class or struct declaration
        class_match = re.search(r'(?:class|struct)\s+(\w+)', code, re.IGNORECASE)
        if class_match:
            return class_match.group(1)
    
    elif language == "cpp":
        # Look for class declaration
        class_match = re.search(r'class\s+(\w+)', code, re.IGNORECASE)
        if class_match:
            return class_match.group(1)
    
    elif language == "python":
        # Look for class declaration
        class_match = re.search(r'class\s+(\w+)', code, re.IGNORECASE)
        if class_match:
            return class_match.group(1).lower()
        
        # Look for if __name__ == "__main__" pattern
        if re.search(r'if\s+__name__\s*==\s*["\']__main__["\']', code):
            return "main"
    
    elif language == "go":
        # Look for package name (though main is usually the package for executables)
        package_match = re.search(r'package\s+(\w+)', code)
        if package_match and package_match.group(1) != "main":
            return package_match.group(1)
    
    elif language == "rust":
        # Look for main function or mod declaration
        mod_match = re.search(r'mod\s+(\w+)', code)
        if mod_match:
            return mod_match.group(1)
    
    elif language == "php":
        # Look for class declaration
        class_match = re.search(r'class\s+(\w+)', code, re.IGNORECASE)
        if class_match:
            return class_match.group(1)
    
    elif language == "ruby":
        # Look for class declaration
        class_match = re.search(r'class\s+(\w+)', code, re.IGNORECASE)
        if class_match:
            return class_match.group(1).lower()
    
    elif language == "javascript":
        # Look for class declaration
        class_match = re.search(r'class\s+(\w+)', code, re.IGNORECASE)
        if class_match:
            return class_match.group(1)
        
        # Look for function declaration that might be the main function
        function_match = re.search(r'function\s+(\w+)', code, re.IGNORECASE)
        if function_match and function_match.group(1).lower() in ['main', 'app', 'index']:
            return function_match.group(1)
    
    # Return default name if no specific pattern found
    return LANGUAGE_CONFIGS[language]["default_name"]

def get_full_filename(code, language):
    """Get the full filename with extension for the given code and language."""
    base_name = extract_filename_from_code(code, language)
    extension = LANGUAGE_CONFIGS[language]["extension"]
    return f"{base_name}.{extension}"

def transform_java_code_for_judge0(code):
    """
    Transform Java code to work with Judge0's limitations.
    Judge0 expects the main class to be named 'Main', so we'll rename any public class to 'Main'.
    """
    # Find the public class and rename it to Main
    public_class_match = re.search(r'public\s+class\s+(\w+)', code, re.IGNORECASE)
    if public_class_match:
        original_class_name = public_class_match.group(1)
        if original_class_name != "Main":
            # Replace the class name with Main
            transformed_code = re.sub(
                r'public\s+class\s+' + re.escape(original_class_name),
                'public class Main',
                code,
                flags=re.IGNORECASE
            )
            return transformed_code, original_class_name
    
    # If no public class found, check for any class
    class_match = re.search(r'class\s+(\w+)', code, re.IGNORECASE)
    if class_match:
        original_class_name = class_match.group(1)
        if original_class_name != "Main":
            # Make it public and rename to Main
            transformed_code = re.sub(
                r'class\s+' + re.escape(original_class_name),
                'public class Main',
                code,
                flags=re.IGNORECASE
            )
            return transformed_code, original_class_name
    
    # If no class found, return original code
    return code, None

judge0_available = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    global judge0_available
    logger.info("🚀 CodeMaster Backend starting...")
    logger.info(f"📁 Using temporary directory: {TEMP_DIR}")
    logger.info(f"📋 Logs directory: {LOG_DIR}")
    
    judge0_available = await check_judge0_availability()
    
    if judge0_available:
        logger.info("✅ Judge0 online compiler ready")
    else:
        logger.warning("❌ Judge0 not available - check configuration")
    
    yield
    
    # Cleanup on shutdown
    logger.info("🧹 Cleaning up temporary files...")
    try:
        shutil.rmtree(TEMP_DIR, ignore_errors=True)
        logger.info("✅ Temporary files cleaned up successfully")
    except Exception as e:
        logger.error(f"❌ Failed to cleanup temp directory: {str(e)}")
    
    logger.info("🛑 Backend shutting down...")

app = FastAPI(title="CodeMaster Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class CodeExecutionRequest(BaseModel):
    code: str
    language: str
    input: Optional[str] = ""
    filename: Optional[str] = None  # Allow custom filename

class AIGenerateRequest(BaseModel):
    prompt: str
    language: str
    mode: Optional[str] = "code-generation"

class AIExplainRequest(BaseModel):
    code: str
    language: str

class AITranslateRequest(BaseModel):
    code: str
    source_language: str
    target_language: str

class SyntaxCheckRequest(BaseModel):
    code: str
    language: str

def detect_runtime_input(code, language):
    """Detect if code requires runtime input."""
    if language not in RUNTIME_INPUT_PATTERNS:
        return False
    
    patterns = RUNTIME_INPUT_PATTERNS[language]
    for pattern in patterns:
        if re.search(pattern, code, re.IGNORECASE):
            return True
    return False

async def check_judge0_availability():
    """Check if Judge0 is available."""
    if not JUDGE0_API_KEY:
        return False
    
    try:
        headers = {
            "X-RapidAPI-Key": JUDGE0_API_KEY,
            "X-RapidAPI-Host": JUDGE0_HOST
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{JUDGE0_API_URL}/languages", headers=headers)
            return response.status_code == 200
    except Exception as e:
        logger.error(f"Judge0 availability check failed: {str(e)}")
        return False

async def execute_code_judge0(code, language, user_input="", custom_filename=None):
    """Execute code using Judge0 with proper Java class name transformation."""
    if not judge0_available:
        return {"output": "Judge0 not available. Please check configuration.", "success": False}
    
    if language not in JUDGE0_LANGUAGE_IDS:
        return {"output": f"Language {language} not supported", "success": False}
    
    # Check for runtime input
    if detect_runtime_input(code, language):
        return {
            "output": "Sorry for the inconvenience, this is not able to work for runtime inputs",
            "success": False,
            "runtime_input_detected": True
        }
    
    # Create temporary file for logging execution details
    execution_id = f"exec_{asyncio.current_task().get_name() if asyncio.current_task() else 'unknown'}"
    temp_log_file = None
    
    try:
        # Get the appropriate filename for display purposes
        if custom_filename:
            display_filename = custom_filename
        else:
            display_filename = get_full_filename(code, language)
        
        # Create temporary log file for this execution
        temp_log_file = create_temp_file(
            f"Execution Log - {execution_id}\n"
            f"Language: {language}\n"
            f"Filename: {display_filename}\n"
            f"Timestamp: {asyncio.get_event_loop().time()}\n"
            f"Code Length: {len(code)} characters\n"
            f"{'='*50}\n"
            f"{code}\n"
            f"{'='*50}\n",
            f"{execution_id}.log"
        )
        
        # For Java, transform the code to work with Judge0
        execution_code = code
        original_class_name = None
        
        if language == "java":
            execution_code, original_class_name = transform_java_code_for_judge0(code)
            if original_class_name:
                logger.info(f"Transformed Java class '{original_class_name}' to 'Main' for Judge0 execution")
        
        # Prepare submission data
        submission_data = {
            "source_code": base64.b64encode(execution_code.encode()).decode(),
            "language_id": JUDGE0_LANGUAGE_IDS[language],
            "stdin": base64.b64encode(user_input.encode()).decode() if user_input else "",
        }
        
        headers = {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": JUDGE0_API_KEY,
            "X-RapidAPI-Host": JUDGE0_HOST
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Submit the code for execution
            response = await client.post(
                f"{JUDGE0_API_URL}/submissions?base64_encoded=true&wait=false",
                json=submission_data,
                headers=headers
            )
            
            if response.status_code != 201:
                error_msg = f"Submission failed: {response.text}"
                logger.error(error_msg)
                return {"output": error_msg, "success": False}
            
            submission = response.json()
            token = submission["token"]
            logger.info(f"Code submitted to Judge0 with token: {token}")
            
            # Wait for execution to complete
            max_attempts = 15  # Increased for Java compilation
            for attempt in range(max_attempts):
                await asyncio.sleep(1.5 if language == "java" else 1)  # Longer wait for Java
                
                result_response = await client.get(
                    f"{JUDGE0_API_URL}/submissions/{token}?base64_encoded=true",
                    headers=headers
                )
                
                if result_response.status_code != 200:
                    continue
                
                result = result_response.json()
                status_id = result.get("status", {}).get("id")
                
                if status_id in [1, 2]:  # In Queue or Processing
                    continue
                elif status_id == 3:  # Accepted
                    output = ""
                    if result.get("stdout"):
                        output += base64.b64decode(result["stdout"]).decode()
                    if result.get("stderr"):
                        stderr_content = base64.b64decode(result["stderr"]).decode()
                        # For Java, filter out non-critical warnings
                        if language == "java":
                            stderr_lines = stderr_content.split('\n')
                            filtered_stderr = []
                            for line in stderr_lines:
                                if line.strip() and not any(warning in line.lower() for warning in [
                                    'note:', 'warning:', 'picked up java_tool_options'
                                ]):
                                    filtered_stderr.append(line)
                            if filtered_stderr:
                                output += '\n'.join(filtered_stderr)
                        else:
                            output += stderr_content
                    
                    success_message = "Code executed successfully (no output)"
                    if language == "java" and original_class_name:
                        success_message = f"Java class '{original_class_name}' executed successfully"
                    
                    logger.info(f"Execution successful for {execution_id}")
                    return {
                        "output": output or success_message,
                        "success": True,
                        "execution_time": f"{result.get('time', 0)}s",
                        "memory": f"{result.get('memory', 0)}KB",
                        "filename": display_filename,
                        "original_class_name": original_class_name
                    }
                else:  # Error states
                    error_output = ""
                    
                    # Handle compilation errors
                    if result.get("compile_output"):
                        compile_error = base64.b64decode(result["compile_output"]).decode()
                        error_output += compile_error
                    
                    if result.get("stderr"):
                        stderr_content = base64.b64decode(result["stderr"]).decode()
                        if stderr_content.strip():
                            error_output += f"\nRuntime Error:\n{stderr_content}"
                    
                    # If no specific error output, use status description
                    if not error_output.strip():
                        error_output = result.get("status", {}).get("description", "Unknown error")
                    
                    logger.warning(f"Execution failed for {execution_id}: {error_output}")
                    return {
                        "output": error_output,
                        "success": False,
                        "status": result.get("status", {}).get("description", "Unknown error"),
                        "filename": display_filename
                    }
            
            timeout_msg = "Execution timeout - please try again"
            logger.warning(f"Execution timeout for {execution_id}")
            return {"output": timeout_msg, "success": False}
            
    except Exception as e:
        error_msg = f"Execution error: {str(e)}"
        logger.error(f"Execution exception for {execution_id}: {error_msg}")
        return {"output": error_msg, "success": False}
    finally:
        # Cleanup temporary log file
        if temp_log_file:
            cleanup_temp_file(temp_log_file)

async def call_groq(messages, temperature=0.2, max_tokens=4096):
    """Call Groq for AI features."""
    try:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": GROQ_MODEL,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(GROQ_API_URL, json=payload, headers=headers)
            
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail=f"AI service error: {response.text}")
            
            result = response.json()
            
            if "choices" not in result or len(result["choices"]) == 0:
                raise HTTPException(status_code=500, detail="Unexpected response from AI service")
            
            return result["choices"][0]["message"]["content"]
    
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"AI service unavailable: {str(e)}")

def clean_code_response(response, language):
    """Clean AI response to extract code."""
    cleaned = response.strip()
    
    patterns = [f"\`\`\`{language}", "\`\`\`" + language.lower(), "\`\`\`" + language.upper(), "\`\`\`"]
    
    for pattern in patterns:
        cleaned = cleaned.replace(pattern, "")
    
    prefixes = [
        "Here's the code:", "Here is the code:", "Here's your code:",
        "Here is your code:", "The code is:", "Here's the solution:",
        "Here is the solution:",
    ]
    
    for prefix in prefixes:
        if cleaned.lower().startswith(prefix.lower()):
            cleaned = cleaned[len(prefix):].strip()
    
    lines = cleaned.split('\n')
    code_lines = []
    
    for line in lines:
        if any(marker in line.lower() for marker in ['explanation:', 'this code', 'the above', 'note:']):
            break
        code_lines.append(line)
    
    return '\n'.join(code_lines).strip()

# Routes
@app.get("/health")
async def health_check():
    return {
        "status": "OK", 
        "judge0_available": judge0_available,
        "temp_dir": TEMP_DIR,
        "log_dir": LOG_DIR
    }

@app.get("/languages")
async def get_languages():
    languages = [
        {"value": key, "label": key.capitalize(), "extension": value["extension"]}
        for key, value in LANGUAGE_CONFIGS.items()
        if key in JUDGE0_LANGUAGE_IDS
    ]
    return {"languages": languages}

@app.post("/run")
async def run_code(request: CodeExecutionRequest):
    if not request.code or not request.language:
        raise HTTPException(status_code=400, detail="Code and language are required")
    
    if request.language not in JUDGE0_LANGUAGE_IDS:
        raise HTTPException(status_code=400, detail=f"Language {request.language} not supported")
    
    import time
    start_time = time.time()
    result = await execute_code_judge0(request.code, request.language, request.input, request.filename)
    execution_time = time.time() - start_time
    
    if "execution_time" not in result:
        result["execution_time"] = f"{execution_time:.2f}s"
    
    return result

# New endpoint to get filename for current code
@app.post("/get-filename")
async def get_filename(request: SyntaxCheckRequest):
    if not request.code or not request.language:
        raise HTTPException(status_code=400, detail="Code and language are required")
    
    filename = get_full_filename(request.code, request.language)
    base_name = extract_filename_from_code(request.code, request.language)
    
    return {
        "filename": filename,
        "basename": base_name,
        "extension": LANGUAGE_CONFIGS[request.language]["extension"],
        "language": request.language
    }

@app.post("/generate")
async def generate_code(request: AIGenerateRequest):
    if not request.prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")
    
    try:
        # Enhanced prompt to include proper class/filename conventions
        system_prompt = f"""You are an expert {request.language} programmer. Generate clean, well-commented {request.language} code for the user's request. 

IMPORTANT NAMING CONVENTIONS:
- For Java: Use proper class names that match filename requirements (e.g., public class HelloWorld)
- For Kotlin: Use proper class names (e.g., class Calculator)
- For Swift: Use proper class/struct names
- For other languages: Follow best practices for naming

Write ONLY the code, no explanations outside the code. Include helpful comments within the code. Follow best practices for {request.language}."""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": request.prompt}
        ]
        
        generated_code = await call_groq(messages, temperature=0.2)
        clean_code = clean_code_response(generated_code, request.language)
        
        # Get the filename that would be used for this code
        filename = get_full_filename(clean_code, request.language)
        
        explanation_messages = [
            {"role": "system", "content": "You are an expert programming teacher. Explain the code clearly and concisely."},
            {"role": "user", "content": f"Explain this {request.language} code:\n\n{clean_code}"}
        ]
        
        explanation = await call_groq(explanation_messages, temperature=0.3)
        
        return {
            "generatedCode": clean_code,
            "explanation": explanation.strip(),
            "language": request.language,
            "filename": filename
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/explain")
async def explain_code(request: AIExplainRequest):
    if not request.code:
        raise HTTPException(status_code=400, detail="Code is required")
    
    try:
        messages = [
            {"role": "system", "content": f"You are an expert {request.language} programmer and teacher. Explain the code clearly, covering what it does, how it works, and key concepts."},
            {"role": "user", "content": f"Explain this {request.language} code:\n\n{request.code}"}
        ]
        
        explanation = await call_groq(messages, temperature=0.3)
        
        return {"explanation": explanation.strip(), "language": request.language}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/translate")
async def translate_code(request: AITranslateRequest):
    if not request.code:
        raise HTTPException(status_code=400, detail="Code is required")
    
    try:
        # Enhanced translation prompt with naming conventions
        system_prompt = f"""You are an expert programmer. Translate the {request.source_language} code to {request.target_language}. Maintain the same functionality.

IMPORTANT: Follow proper naming conventions for {request.target_language}:
- For Java: Use proper class names (e.g., public class Calculator)
- For Kotlin: Use proper class names
- For Swift: Use proper class/struct names
- Maintain logical naming that would work as filenames

Write ONLY the translated code, no explanations outside the code."""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Translate this {request.source_language} code to {request.target_language}:\n\n{request.code}"}
        ]
        
        translated_code = await call_groq(messages, temperature=0.2)
        clean_code = clean_code_response(translated_code, request.target_language)
        
        # Get filename for translated code
        filename = get_full_filename(clean_code, request.target_language)
        
        explanation_messages = [
            {"role": "system", "content": "Explain the translation process and key differences."},
            {"role": "user", "content": f"Explain how this code was translated from {request.source_language} to {request.target_language}:\n\nOriginal:\n{request.code}\n\nTranslated:\n{clean_code}"}
        ]
        
        explanation = await call_groq(explanation_messages, temperature=0.3)
        
        return {
            "translatedCode": clean_code,
            "explanation": explanation.strip(),
            "sourceLanguage": request.source_language,
            "targetLanguage": request.target_language,
            "filename": filename
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/optimize")
async def optimize_code(request: AIExplainRequest):
    if not request.code:
        raise HTTPException(status_code=400, detail="Code is required")
    
    try:
        messages = [
            {"role": "system", "content": f"You are an expert {request.language} programmer specializing in optimization. Optimize the code for better performance, readability, and maintainability. Maintain proper naming conventions. Write ONLY the optimized code, no explanations outside the code."},
            {"role": "user", "content": f"Optimize this {request.language} code:\n\n{request.code}"}
        ]
        
        optimized_code = await call_groq(messages, temperature=0.2)
        clean_code = clean_code_response(optimized_code, request.language)
        
        explanation_messages = [
            {"role": "system", "content": "Explain the optimizations made and why they improve performance."},
            {"role": "user", "content": f"Explain the optimizations made to this {request.language} code:\n\nOriginal:\n{request.code}\n\nOptimized:\n{clean_code}"}
        ]
        
        explanation = await call_groq(explanation_messages, temperature=0.3)
        
        return {
            "optimizedCode": clean_code,
            "explanation": explanation.strip(),
            "language": request.language
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-tests")
async def generate_tests(request: AIExplainRequest):
    if not request.code:
        raise HTTPException(status_code=400, detail="Code is required")
    
    try:
        messages = [
            {"role": "system", "content": f"You are an expert {request.language} programmer specializing in testing. Generate comprehensive test cases for the code. Follow proper naming conventions for test classes. Write ONLY the test code, no explanations outside the code."},
            {"role": "user", "content": f"Generate test cases for this {request.language} code:\n\n{request.code}"}
        ]
        
        test_code = await call_groq(messages, temperature=0.2)
        clean_code = clean_code_response(test_code, request.language)
        
        explanation_messages = [
            {"role": "system", "content": "Explain the test cases and what they verify."},
            {"role": "user", "content": f"Explain these test cases for {request.language} code:\n\n{clean_code}"}
        ]
        
        explanation = await call_groq(explanation_messages, temperature=0.3)
        
        return {
            "testCode": clean_code,
            "explanation": explanation.strip(),
            "language": request.language
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/syntax-check")
async def syntax_check(request: SyntaxCheckRequest):
    if not request.code:
        raise HTTPException(status_code=400, detail="Code is required")
    
    try:
        messages = [
            {"role": "system", "content": f"You are an expert {request.language} programmer. Check the code for syntax errors and provide specific error messages with line numbers if possible. If no errors are found, respond with exactly 'No syntax errors found'. If errors exist, list them clearly with line numbers."},
            {"role": "user", "content": f"Check this {request.language} code for syntax errors:\n\n{request.code}"}
        ]
        
        result = await call_groq(messages, temperature=0.1)
        
        # Parse the result to determine if there are errors
        if "No syntax errors found" in result or "no syntax errors" in result.lower():
            # No errors found - return empty array
            return {"errors": []}
        else:
            # Parse errors from the response
            errors = []
            lines = result.split('\n')
            line_number = 1
            
            for line in lines:
                line = line.strip()
                if line and ('error' in line.lower() or 'line' in line.lower() or 'syntax' in line.lower()):
                    # Try to extract line number from the error message
                    import re
                    line_match = re.search(r'line\s*(\d+)', line, re.IGNORECASE)
                    if line_match:
                        line_number = int(line_match.group(1))
                    
                    errors.append({
                        "line": line_number,
                        "message": line,
                        "severity": "error"
                    })
                    line_number += 1
            
            # If no specific errors were parsed but result indicates errors exist
            if not errors and result.strip():
                errors.append({
                    "line": 1,
                    "message": result.strip(),
                    "severity": "error"
                })
            
            return {"errors": errors}
    
    except Exception as e:
        # Return error in the expected format
        return {
            "errors": [{
                "line": 1, 
                "message": f"Syntax check failed: {str(e)}", 
                "severity": "warning"
            }]
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=int(os.getenv("PORT")), reload=True)
