import os
import time
import json
import redis
import mysql.connector
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# --- הגדרות חיבור באמצעות משתני סביבה ---
# כאשר מריצים ב-Docker Compose, אלו יהיו שמות השירותים
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
DB_NAME = os.getenv("DB_NAME", "student_db")

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_CACHE_KEY = "all_users_cache"
CACHE_EXPIRATION_SEC = 30 # נתונים במטמון יהיו בתוקף ל-30 שניות

app = FastAPI(title="Minimal Student Registration API")

# --- הגדרת CORS עבור ה-Frontend ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # מאפשר גישה מכל דומיין (לצורך פיתוח)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- לוגיקת חיבור ---
def get_db_connection():
    # ניסיון חיבור עם Retries כדי להתמודד עם אתחול Docker
    max_retries = 5
    for i in range(max_retries):
        try:
            mydb = mysql.connector.connect(
                host=DB_HOST,
                user=DB_USER,
                password=DB_PASSWORD,
                database=DB_NAME,
                # אוסף פרמטרים חשוב להתחברות קונטיינרים
                auth_plugin='mysql_native_password' 
            )
            print("MySQL connection successful!")
            return mydb
        except mysql.connector.Error as err:
            print(f"Error connecting to MySQL: {err}. Retrying in 5 seconds...")
            time.sleep(5)
    raise ConnectionError("Failed to connect to MySQL after several retries.")

# איתחול Redis
try:
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    r.ping()
    print("Redis connection successful!")
except Exception as e:
    print(f"Could not connect to Redis: {e}")
    r = None 

# יצירת טבלה במידה ולא קיימת
def initialize_db():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL
            )
        """)
        conn.commit()
        cursor.close()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Error during database initialization: {e}")
    finally:
        if conn and conn.is_connected():
            conn.close()

initialize_db()

# --- מודלים של Pydantic ---
class UserCreate(BaseModel):
    name: str
    email: str

class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None

# --- API Endpoints ---

@app.get("/api/users")
async def get_all_users():
    # 1. נסה לקבל נתונים מהמטמון (Redis)
    if r:
        cached_data = r.get(REDIS_CACHE_KEY)
        if cached_data:
            print("Serving data from Redis cache.")
            return json.loads(cached_data)

    # 2. אם לא במטמון, שלוף מ-MySQL
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, name, email FROM users")
        users = cursor.fetchall()

        # 3. שמור את הנתונים במטמון
        if r:
            r.setex(REDIS_CACHE_KEY, CACHE_EXPIRATION_SEC, json.dumps(users))
            print("Data saved to Redis cache.")

        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        if conn and conn.is_connected():
            conn.close()

@app.post("/api/users")
async def create_user(user: UserCreate):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        sql = "INSERT INTO users (name, email) VALUES (%s, %s)"
        cursor.execute(sql, (user.name, user.email))
        conn.commit()
        new_id = cursor.lastrowid
        
        # נקה את המטמון
        if r:
            r.delete(REDIS_CACHE_KEY)
            print("Redis cache cleared after POST.")
            
        return {"id": new_id, "name": user.name, "email": user.email}
    except mysql.connector.Error as e:
        if 'Duplicate entry' in str(e):
             raise HTTPException(status_code=400, detail="User with this email already exists.")
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        if conn and conn.is_connected():
            conn.close()

@app.put("/api/users/{user_id}")
async def update_user(user_id: int, user: UserUpdate):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        updates = []
        params = []
        if user.name is not None:
            updates.append("name = %s")
            params.append(user.name)
        if user.email is not None:
            updates.append("email = %s")
            params.append(user.email)

        if not updates:
            return {"message": "No fields to update."}

        sql = "UPDATE users SET " + ", ".join(updates) + " WHERE id = %s"
        params.append(user_id)
        
        cursor.execute(sql, tuple(params))
        conn.commit()
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        # נקה את המטמון
        if r:
            r.delete(REDIS_CACHE_KEY)
            print("Redis cache cleared after PUT.")

        return {"message": "User updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        if conn and conn.is_connected():
            conn.close()

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        sql = "DELETE FROM users WHERE id = %s"
        cursor.execute(sql, (user_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="User not found")
            
        # נקה את המטמון
        if r:
            r.delete(REDIS_CACHE_KEY)
            print("Redis cache cleared after DELETE.")
            
        return {"message": "User deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        if conn and conn.is_connected():
            conn.close()