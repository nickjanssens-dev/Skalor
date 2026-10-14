from pathlib import Path
import json
import re
import random
import sqlite3
import hashlib
import secrets

from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Response
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from docx import Document

app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DATA_DIR = STATIC_DIR / "data"
TEMPLATES_DIR = BASE_DIR / "templates"
DB_FILE = BASE_DIR / "skalor.db"

SESSION_COOKIE_NAME = "skalor_session"
SESSION_MAX_AGE = 60 * 60 * 24 * 7  # 7 dagen

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

SESSIONS = {}

SUBJECT_FILES = {
    "biologie": "biology.json",
    "chemie": "chemie.json",
    "fysica": "fysica.json",
    "informatica": "informatica.json",
    "nederlands": "nederlands.json",
    "wiskunde": "wiskunde.json",
}

SUBJECT_ALIASES = {
    "biology": "biologie",
    "chemistry": "chemie",
    "physics": "fysica",
    "informatics": "informatica",
    "dutch": "nederlands",
    "math": "wiskunde",
}

PAGES = [
    "boom.html",
    "biologie.html",
    "chemie.html",
    "fysica.html",
    "informatica.html",
    "nederlands.html",
    "wiskunde.html",
    "progression.html",
    "mock-exam.html",
    "Shop.html",
    "Progression.html",
]


class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class ProgressRequest(BaseModel):
    progress: dict


def get_db_connection():
    connection = sqlite3.connect(DB_FILE)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS progress (
            user_id INTEGER PRIMARY KEY,
            progress_json TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)

    connection.commit()
    connection.close()


init_db()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000
    ).hex()

    return f"{salt}${password_hash}"


def verify_password(password: str, stored_password: str) -> bool:
    try:
        salt, original_hash = stored_password.split("$")
    except ValueError:
        return False

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000
    ).hex()

    return secrets.compare_digest(password_hash, original_hash)

def get_current_user(request: Request):
    session_token = request.cookies.get(SESSION_COOKIE_NAME)

    if not session_token or session_token not in SESSIONS:
        raise HTTPException(status_code=401, detail="Niet ingelogd")

    return SESSIONS[session_token]


def get_optional_user(request: Request):
    session_token = request.cookies.get(SESSION_COOKIE_NAME)

    if not session_token or session_token not in SESSIONS:
        return None

    return SESSIONS[session_token]

def render_template(request: Request, page_name: str):
    return templates.TemplateResponse(request, page_name)


def load_json_file(file_path: Path) -> dict:
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Data file not found: {file_path.name}")

    try:
        with open(file_path, "r", encoding="utf-8") as file:
            return json.load(file)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail=f"Invalid JSON file: {file_path.name}")


def load_subject_data(subject: str) -> dict:
    normalized_subject = subject.lower().strip()
    dutch_subject = SUBJECT_ALIASES.get(normalized_subject, normalized_subject)
    filename = SUBJECT_FILES.get(dutch_subject)

    if not filename:
        raise HTTPException(status_code=404, detail="Subject not found")

    return load_json_file(DATA_DIR / filename)


def extract_text_from_txt(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="ignore")


def extract_text_from_docx(file_bytes: bytes) -> str:
    temp_file = BASE_DIR / f"temp_upload_{secrets.token_hex(8)}.docx"

    with open(temp_file, "wb") as file:
        file.write(file_bytes)

    try:
        document = Document(temp_file)

        text = "\n".join(
            paragraph.text
            for paragraph in document.paragraphs
            if paragraph.text.strip()
        )
    finally:
        temp_file.unlink(missing_ok=True)

    return text


def generate_questions_from_text(text: str, max_questions: int = 5) -> list[dict]:
    sentences = re.split(r'(?<=[.!?])\s+', text)
    sentences = [sentence.strip() for sentence in sentences if len(sentence.strip()) > 60]

    random.shuffle(sentences)
    selected_sentences = sentences[:max_questions]

    questions = []

    for sentence in selected_sentences:
        words = re.findall(r'\b[A-Za-zÀ-ÿ]{5,}\b', sentence)

        if len(words) < 4:
            continue

        answer = random.choice(words)
        question_text = sentence.replace(answer, "_____", 1)

        wrong_pool = [
            word for word in words
            if word.lower() != answer.lower()
        ]

        wrong_options = random.sample(wrong_pool, min(3, len(wrong_pool)))

        while len(wrong_options) < 3:
            wrong_options.append("Geen van bovenstaande")

        options = wrong_options + [answer]
        random.shuffle(options)

        questions.append({
            "question": f"Vul het ontbrekende woord in: {question_text}",
            "options": options,
            "answer": options.index(answer)
        })

    return questions


@app.get("/", response_class=HTMLResponse)
def read_index(request: Request):
    return render_template(request, "index.html")


def make_template_handler(page_name: str):
    def handler(request: Request):
        return render_template(request, page_name)

    return handler


for page in PAGES:
    clean_name = page.replace(".html", "")
    handler = make_template_handler(page)

    app.add_api_route(
        f"/{page}",
        handler,
        methods=["GET"],
        response_class=HTMLResponse,
        name=f"page_{clean_name}_html"
    )

    app.add_api_route(
        f"/{clean_name}",
        handler,
        methods=["GET"],
        response_class=HTMLResponse,
        name=f"page_{clean_name}"
    )


for english_name, dutch_name in SUBJECT_ALIASES.items():
    page_name = f"{dutch_name}.html"

    if page_name in PAGES:
        handler = make_template_handler(page_name)

        app.add_api_route(
            f"/{english_name}",
            handler,
            methods=["GET"],
            response_class=HTMLResponse,
            name=f"alias_{english_name}"
        )


@app.post("/api/auth/register")
def register_user(data: RegisterRequest, response: Response):
    username = data.username.strip()

    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Gebruikersnaam moet minstens 3 tekens hebben")

    if len(data.password) < 4:
        raise HTTPException(status_code=400, detail="Wachtwoord moet minstens 4 tekens hebben")

    connection = get_db_connection()
    cursor = connection.cursor()

    existing_user = cursor.execute(
        "SELECT id FROM users WHERE username = ?",
        (username,)
    ).fetchone()

    if existing_user:
        connection.close()
        raise HTTPException(status_code=400, detail="Gebruikersnaam bestaat al")

    cursor.execute(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)",
        (username, hash_password(data.password))
    )
    user_id = cursor.lastrowid
    connection.commit()
    connection.close()

    # Automatisch inloggen na registratie
    session_token = secrets.token_urlsafe(32)
    SESSIONS[session_token] = {
        "id": user_id,
        "username": username
    }

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        samesite="lax",
        max_age=SESSION_MAX_AGE
    )

    return {
        "message": "Account aangemaakt en ingelogd",
        "user": {
            "id": user_id,
            "username": username
        }
    }


@app.post("/api/auth/login")
def login_user(data: LoginRequest, response: Response):
    username = data.username.strip()

    connection = get_db_connection()
    cursor = connection.cursor()

    user = cursor.execute(
        "SELECT id, username, password_hash FROM users WHERE username = ?",
        (username,)
    ).fetchone()

    connection.close()

    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Ongeldige gebruikersnaam of wachtwoord")

    session_token = secrets.token_urlsafe(32)

    SESSIONS[session_token] = {
        "id": user["id"],
        "username": user["username"]
    }

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        samesite="lax",
        max_age=SESSION_MAX_AGE
    )

    return {
        "message": "Ingelogd",
        "user": {
            "id": user["id"],
            "username": user["username"]
        }
    }


@app.post("/api/auth/logout")
def logout_user(request: Request, response: Response):
    session_token = request.cookies.get(SESSION_COOKIE_NAME)

    if session_token in SESSIONS:
        del SESSIONS[session_token]

    response.delete_cookie(SESSION_COOKIE_NAME)

    return {"message": "Uitgelogd"}


@app.get("/api/auth/me")
def get_logged_in_user(request: Request):
    user = get_optional_user(request)

    if not user:
        return {
            "authenticated": False,
            "user": None
        }

    return {
        "authenticated": True,
        "user": user
    }


@app.get("/api/auth/progress")
def get_user_progress(request: Request):
    user = get_current_user(request)

    connection = get_db_connection()
    cursor = connection.cursor()

    row = cursor.execute(
        "SELECT progress_json FROM progress WHERE user_id = ?",
        (user["id"],)
    ).fetchone()

    connection.close()

    if not row:
        return {"progress": {}}

    return {"progress": json.loads(row["progress_json"])}


@app.post("/api/auth/progress")
def save_user_progress(data: ProgressRequest, request: Request):
    user = get_current_user(request)

    connection = get_db_connection()
    cursor = connection.cursor()

    progress_json = json.dumps(data.progress)

    cursor.execute("""
        INSERT INTO progress (user_id, progress_json)
        VALUES (?, ?)
        ON CONFLICT(user_id)
        DO UPDATE SET progress_json = excluded.progress_json
    """, (user["id"], progress_json))

    connection.commit()
    connection.close()

    return {"message": "Progress opgeslagen"}


@app.get("/api/{subject}")
def get_subject_data(subject: str):
    return load_subject_data(subject)


@app.get("/api/{subject}/topics")
def get_subject_topics(subject: str):
    data = load_subject_data(subject)

    topics = []

    for topic_id, topic_data in data.items():
        topics.append({
            "id": topic_id,
            "title": topic_data["title"],
            "leaves": [
                {
                    "id": leaf_id,
                    "title": leaf_data["title"]
                }
                for leaf_id, leaf_data in topic_data.get("leaves", {}).items()
            ]
        })

    return {"topics": topics}


@app.get("/api/{subject}/topic/{topic_id}")
def get_subject_topic(subject: str, topic_id: str):
    data = load_subject_data(subject)

    if topic_id not in data:
        raise HTTPException(status_code=404, detail="Onderwerp niet gevonden")

    return data[topic_id]


@app.post("/api/upload/generate-quiz")
async def upload_and_generate_quiz(file: UploadFile = File(...)):
    filename = file.filename.lower()
    file_bytes = await file.read()

    if filename.endswith(".txt"):
        text = extract_text_from_txt(file_bytes)
    elif filename.endswith(".docx"):
        text = extract_text_from_docx(file_bytes)
    else:
        raise HTTPException(
            status_code=400,
            detail="Alleen .txt en .docx bestanden zijn toegestaan"
        )

    if len(text.strip()) < 100:
        raise HTTPException(
            status_code=400,
            detail="Document bevat te weinig tekst om vragen te maken"
        )

    questions = generate_questions_from_text(text, max_questions=5)

    if not questions:
        raise HTTPException(
            status_code=400,
            detail="Kon geen vragen genereren uit dit document"
        )

    return {
        "filename": file.filename,
        "question_count": len(questions),
        "questions": questions
    }


@app.get("/api/{subject}/mock-exam")
def generate_mock_exam(subject: str, amount: int = 10):
    data = load_subject_data(subject)

    all_questions = []

    for topic in data.values():
        if "quiz" in topic:
            all_questions.extend(topic["quiz"])

    if not all_questions:
        raise HTTPException(status_code=400, detail="Geen quizvragen gevonden")

    selected = random.sample(all_questions, min(amount, len(all_questions)))

    return {
        "subject": subject,
        "total": len(selected),
        "questions": selected
    }