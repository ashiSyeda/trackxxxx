
import os
import datetime
import sqlite3
from functools import wraps
from flask import Flask, request, jsonify, g
from flask_cors import CORS, cross_origin
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from dotenv import load_dotenv

load_dotenv()

# -------------------------------
# Config
# -------------------------------
DB_FILE = os.getenv("SQLITE_FILE", "smart_gps.db")
JWT_SECRET = os.getenv("JWT_SECRET", "change_this_secret")
JWT_ALGORITHM = "HS256"
JWT_EXP_MINUTES = int(os.getenv("JWT_EXP_MINUTES", "1440"))
CORS_ORIGINS = ["http://localhost:8080", "http://localhost:3000", "http://localhost:5173", "http://192.168.100.5:8080"]

app = Flask(__name__)

CORS(app, origins=CORS_ORIGINS, supports_credentials=True, allow_headers='*', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        response.headers.add("Access-Control-Allow-Origin", request.headers.get("Origin", "*"))
        response.headers.add("Access-Control-Allow-Credentials", "true")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        return response

# -------------------------------
# Database helpers
# -------------------------------
def get_db():
    """Return a SQLite connection for this request (cached on 'g')."""
    db = getattr(g, "_database", None)
    if db is None:
        db = sqlite3.connect(DB_FILE, detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES)
        db.row_factory = sqlite3.Row
        # Option B: keep foreign keys OFF to avoid constraint errors for deletes
        db.execute("PRAGMA foreign_keys = OFF;")
        g._database = db
    return db

@app.teardown_appcontext
def close_connection(exc):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()

def query_fetchall(sql, params=()):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(sql, params or ())
    rows = cur.fetchall()
    cur.close()
    # convert sqlite3.Row -> dict
    return [dict(r) for r in rows]

def query_fetchone(sql, params=()):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(sql, params or ())
    row = cur.fetchone()
    cur.close()
    return dict(row) if row else None

def query_commit(sql, params=()):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(sql, params or ())
    conn.commit()
    last = cur.lastrowid
    cur.close()
    return last

# -------------------------------
# JWT helpers
# -------------------------------
def create_token(payload):
    exp = datetime.datetime.now(datetime.UTC) + datetime.timedelta(minutes=JWT_EXP_MINUTES)
    payload_copy = payload.copy()
    payload_copy.update({"exp": int(exp.timestamp())})
    token = jwt.encode(payload_copy, JWT_SECRET, algorithm=JWT_ALGORITHM)
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token

def decode_token(token):
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return data
    except jwt.ExpiredSignatureError:
        raise ValueError("Token expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token")

def token_required(require_admin=False):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            auth = request.headers.get("Authorization", "")
            if not auth.startswith("Bearer "):
                return jsonify({"error": "Authorization header missing or invalid"}), 401
            token = auth.split(" ", 1)[1]
            try:
                data = decode_token(token)
            except ValueError as e:
                return jsonify({"error": str(e)}), 401

            # attach user info to request
            request.user = data

            if require_admin and data.get("role") != "admin":
                return jsonify({"error": "Admin access required"}), 403

            return f(*args, **kwargs)
        return wrapped
    return decorator

# -------------------------------
# Utilities
# -------------------------------
def parse_pagination():
    try:
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 50))
        if page < 1: page = 1
        if per_page < 1: per_page = 50
    except ValueError:
        page, per_page = 1, 50
    offset = (page - 1) * per_page
    return offset, per_page

def require_fields(data, fields):
    missing = [f for f in fields if not (data.get(f) or (data.get(f) == 0))]
    if missing:
        return False, f"Missing fields: {', '.join(missing)}"
    return True, ""

# -------------------------------
# Initialize DB schema + seed (runs once if DB missing)
# -------------------------------
SCHEMA_SQL = """
PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS user_categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admins (
    admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    category_id INTEGER,
    emergency_contact TEXT,
    fee_status TEXT,
   
    password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS routes (
    route_id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_name TEXT NOT NULL,
    start_point TEXT NOT NULL,
    end_point TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS route_stops (
    stop_id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER,
    stop_name TEXT NOT NULL,
    stop_number INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_number TEXT NOT NULL,
    driver_name TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    route_id INTEGER
);

CREATE TABLE IF NOT EXISTS cards (
    card_id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_uid TEXT NOT NULL,
    user_id INTEGER,
    status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS access_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    card_id INTEGER,
    action_type TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS access_permissions (
    permission_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    allowed_area TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gps_locations (
    location_id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER,
    latitude TEXT NOT NULL,
    longitude TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""

SEED_SQL = """
-- only insert if tables empty
INSERT INTO user_categories (category_name)
SELECT 'Student' WHERE NOT EXISTS (SELECT 1 FROM user_categories);
INSERT INTO user_categories (category_name)
SELECT 'Teacher' WHERE NOT EXISTS (SELECT 1 FROM user_categories WHERE category_name='Teacher');
INSERT INTO user_categories (category_name)
SELECT 'Staff' WHERE NOT EXISTS (SELECT 1 FROM user_categories WHERE category_name='Staff');
INSERT INTO user_categories (category_name)
SELECT 'Visitor' WHERE NOT EXISTS (SELECT 1 FROM user_categories WHERE category_name='Visitor');

-- admin: password 'admin123' (hashed below if not present)
"""

def init_db():
    need_seed_admin = False
    if not os.path.exists(DB_FILE):
        conn = sqlite3.connect(DB_FILE)
        conn.executescript(SCHEMA_SQL)
        # insert seed categories and other dummy data
        conn.executescript(SEED_SQL)
        # insert sample routes/vehicles if not present
        cur = conn.cursor()
        # admin insertion will be done in Python so hash is correct
        need_seed_admin = True
        conn.commit()
        conn.close()
    else:
        # ensure schema exists (idempotent)
        conn = sqlite3.connect(DB_FILE)
        conn.executescript(SCHEMA_SQL)
        conn.executescript(SEED_SQL)
        conn.commit()
        # check if admin exists
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM admins LIMIT 1;")
        if cur.fetchone() is None:
            need_seed_admin = True
        conn.close()

    if need_seed_admin:
        # create default admin and sample data
        conn = sqlite3.connect(DB_FILE)
        cur = conn.cursor()
        # sample admin
        hashed = generate_password_hash("admin123")
        try:
            cur.execute("INSERT OR IGNORE INTO admins (name, email, password_hash) VALUES (?, ?, ?)",
                        ("Super Admin", "admin@smartgps.com", hashed))
        except Exception:
            pass

        # sample routes
        cur.execute("SELECT COUNT(1) FROM routes")
        if cur.fetchone()[0] == 0:
            cur.executemany("INSERT INTO routes (route_name, start_point, end_point) VALUES (?, ?, ?)", [
                ("Route A", "Campus Gate 1", "North Block"),
                ("Route B", "South Gate", "Main Library"),
            ])
        # sample route stops
        cur.execute("SELECT COUNT(1) FROM route_stops")
        if cur.fetchone()[0] == 0:
            cur.executemany("INSERT INTO route_stops (route_id, stop_name, stop_number) VALUES (?, ?, ?)", [
                (1, "Gate 1", 1),
                (1, "Science Dept", 2),
                (1, "North Block", 3),
                (2, "South Gate", 1),
                (2, "Cafeteria", 2),
                (2, "Library", 3),
            ])
        # sample vehicles
        cur.execute("SELECT COUNT(1) FROM vehicles")
        if cur.fetchone()[0] == 0:
            cur.executemany("INSERT INTO vehicles (vehicle_number, driver_name, capacity, route_id) VALUES (?, ?, ?, ?)", [
                ("BUS-101", "Aslam Driver", 40, 1),
                ("BUS-202", "Akhtar Driver", 50, 2),
            ])

        conn.commit()
        conn.close()

# run init on start
init_db()

# -------------------------------
# Routes: Categories
# -------------------------------
@app.route('/categories', methods=['GET'])
def get_categories():
    offset, per_page = parse_pagination()
    try:
        rows = query_fetchall("SELECT * FROM user_categories LIMIT ? OFFSET ?", (per_page, offset))
        return jsonify(rows)
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/categories', methods=['POST'])
@token_required(require_admin=True)
def add_category():
    data = request.json or {}
    ok, msg = require_fields(data, ["category_name"])
    if not ok:
        return jsonify({"error": msg}), 400
    try:
        query_commit("INSERT INTO user_categories(category_name) VALUES (?)", (data['category_name'],))
        return jsonify({"message": "Category added"}), 201
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/categories/<int:id>', methods=['PUT'])
@token_required(require_admin=True)
def update_category(id):
    data = request.json or {}
    ok, msg = require_fields(data, ["category_name"])
    if not ok:
        return jsonify({"error": msg}), 400
    try:
        query_commit("UPDATE user_categories SET category_name=? WHERE category_id=?", (data['category_name'], id))
        return jsonify({"message": "Category updated"})
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/categories/<int:id>', methods=['DELETE'])
@token_required(require_admin=True)
def delete_category(id):
    try:
        query_commit("DELETE FROM user_categories WHERE category_id=?", (id,))
        return jsonify({"message": "Category deleted"})
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

# -------------------------------
# User register & login
# -------------------------------
@app.route('/user/register', methods=['POST','OPTIONS'])
# @cross_origin()
def user_register():
    data = request.json or {}
    ok, msg = require_fields(data, ["name", "email", "phone", "category_id", "password"])
    if not ok:
        return jsonify({"error": msg}), 400
    try:
        hashed = generate_password_hash(data['password'])
        query_commit("""
            INSERT INTO users (name, email, phone, category_id, emergency_contact, fee_status, password_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (data['name'], data['email'], data['phone'], data['category_id'],
              data.get('emergency_contact', ''), data.get('fee_status', 'unpaid'), hashed))
        return jsonify({"message": "User registered successfully"}), 201
    except sqlite3.IntegrityError as e:
        return jsonify({"error": "Email already exists"}), 400
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/user/login', methods=['POST', 'OPTIONS'])
def user_login():
    data = request.json or {}
    ok, msg = require_fields(data, ["email", "password"])
    if not ok:
        return jsonify({"error": msg}), 400
    try:
        user = query_fetchone("SELECT * FROM users WHERE email=?", (data['email'],))
        if not user or not user.get("password_hash"):
            return jsonify({"error": "Invalid email or password"}), 401
        if not check_password_hash(user['password_hash'], data['password']):
            return jsonify({"error": "Invalid email or password"}), 401

        token = create_token({
            "user_id": user['user_id'],
            "name": user['name'],
            "role": "user"
        })
        return jsonify({
            "message": "Login successful",
            "token": token,
            "user": {"user_id": user['user_id'], "name": user['name'], "category_id": user.get('category_id')}
        })
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

# -------------------------------
# Users CRUD
# -------------------------------
@app.route('/users', methods=['GET'])
@token_required(require_admin=True)
def get_users():
    offset, per_page = parse_pagination()
    try:
        rows = query_fetchall("SELECT * FROM users LIMIT ? OFFSET ?", (per_page, offset))
        for r in rows:
            r.pop('password_hash', None)
        return jsonify(rows)
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/users/<int:id>', methods=['PUT'])
@token_required(require_admin=True)
def update_user(id):
    user = query_fetchone("SELECT user_id FROM users WHERE user_id=?", (id,))
    if not user:
        return jsonify({"error": "User not found"}), 404
    data = request.json or {}
    # Validate and convert vehicle_id
    # if 'vehicle_id' in data and data['vehicle_id'] is not None:
    #     try:
    #         data['vehicle_id'] = int(data['vehicle_id'])
    #         # Check if vehicle exists
    #         vehicle = query_fetchone("SELECT vehicle_id FROM vehicles WHERE vehicle_id=?", (data['vehicle_id'],))
    #         if not vehicle:
    #             return jsonify({"error": "Vehicle not found"}), 400
    #     except (ValueError, TypeError):
    #         return jsonify({"error": "vehicle_id must be integer"}), 400
    fields = []
    params = []
    allowed = ['name', 'email', 'phone', 'category_id', 'emergency_contact', 'fee_status', 'password']
    for k in allowed:
        if k in data:
            if k == 'password':
                fields.append("password_hash=?")
                params.append(generate_password_hash(data[k]))
            else:
                fields.append(f"{k}=?")
                params.append(data[k])
    if not fields:
        return jsonify({"error": "No valid fields provided"}), 400
    params.append(id)
    sql = "UPDATE users SET " + ", ".join(fields) + " WHERE user_id=?"
    try:
        query_commit(sql, tuple(params))
        return jsonify({"message": "User updated"})
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/users/<int:id>', methods=['DELETE'])
@token_required(require_admin=True)
def delete_user(id):
    try:
        # manual cascade deletes (since foreign_keys=OFF)
        query_commit("DELETE FROM access_logs WHERE user_id=?", (id,))
        query_commit("DELETE FROM cards WHERE user_id=?", (id,))
        query_commit("DELETE FROM users WHERE user_id=?", (id,))
        return jsonify({"message": "User deleted successfully"})
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

# -------------------------------
# User Profile Management (for users to update/delete their own profile)
# -------------------------------
# --------------------- USER PROFILE ROUTES -------------------------

@app.route('/user/profile', methods=['GET'])
@token_required()
def get_user_profile():
    try:
        if request.user.get("role") != "user":
            return jsonify({"error": "User access required"}), 403

        user_id = request.user["user_id"]

        user = query_fetchone("""
            SELECT user_id, name, email, phone, category_id,
                   emergency_contact, fee_status
            FROM users WHERE user_id=?
        """, (user_id,))

        if not user:
            return jsonify({"error": "User not found"}), 404

        return jsonify({"user": user}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/user/profile', methods=['PUT'])
@token_required()
def update_user_profile():
    try:
        if request.user.get("role") != "user":
            return jsonify({"error": "User access required"}), 403

        user_id = request.user["user_id"]
        data = request.json or {}

        allowed = ["name", "email", "phone", "emergency_contact", "password"]
        fields = []
        params = []

        for key in allowed:
            if key in data:
                if key == "password":
                    fields.append("password_hash=?")
                    params.append(generate_password_hash(data[key]))
                else:
                    fields.append(f"{key}=?")
                    params.append(data[key])

        if not fields:
            return jsonify({"error": "No valid fields provided"}), 400

        params.append(user_id)
        sql = "UPDATE users SET " + ", ".join(fields) + " WHERE user_id=?"

        query_commit(sql, tuple(params))

        updated = query_fetchone("""
            SELECT user_id, name, email, phone, category_id,
                   emergency_contact, fee_status
            FROM users WHERE user_id=?
        """, (user_id,))

        return jsonify({"message": "Profile updated", "user": updated}), 200

    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already exists"}), 400

    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/user/profile', methods=['DELETE'])
@token_required()
def delete_user_profile():
    try:
        if request.user.get("role") != "user":
            return jsonify({"error": "User access required"}), 403

        user_id = request.user["user_id"]

        query_commit("DELETE FROM access_logs WHERE user_id=?", (user_id,))
        query_commit("DELETE FROM cards WHERE user_id=?", (user_id,))
        query_commit("DELETE FROM users WHERE user_id=?", (user_id,))

        return jsonify({"message": "User deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# @app.route('/user/profile', methods=['GET'])
# @token_required()
# def get_user_profile():
#     if request.user.get("role") != "user":
#         return jsonify({"error": "User access required"}), 403
#     user_id = request.user['user_id']
#     try:
#         user = query_fetchone("SELECT user_id, name, email, phone, category_id, emergency_contact, fee_status FROM users WHERE user_id=?", (user_id,))
#         if not user:
#             return jsonify({"error": "User not found"}), 404
#         return jsonify(user)
#     except sqlite3.Error as e:
#         return jsonify({"error": str(e)}), 500

# @app.route('/user/profile', methods=['PUT'])
# @token_required()
# def update_user_profile():
#     if request.user.get("role") != "user":
#         return jsonify({"error": "User access required"}), 403
#     user_id = request.user['user_id']
#     data = request.json or {}
#     fields = []
#     params = []
#     allowed = ['name', 'email', 'phone', 'emergency_contact', 'password']
#     for k in allowed:
#         if k in data:
#             if k == 'password':
#                 fields.append("password_hash=?")
#                 params.append(generate_password_hash(data[k]))
#             else:
#                 fields.append(f"{k}=?")
#                 params.append(data[k])
#     if not fields:
#         return jsonify({"error": "No valid fields provided"}), 400
#     params.append(user_id)
#     sql = "UPDATE users SET " + ", ".join(fields) + " WHERE user_id=?"
#     try:
#         query_commit(sql, tuple(params))
#         # Fetch updated user data
#         updated_user = query_fetchone("SELECT user_id, name, email, phone, category_id, emergency_contact, fee_status FROM users WHERE user_id=?", (user_id,))
#         return jsonify({"message": "Profile updated successfully", "user": updated_user})
#     except sqlite3.IntegrityError:
#         return jsonify({"error": "Email already exists"}), 400
#     except sqlite3.Error as e:
#         return jsonify({"error": str(e)}), 500

# @app.route('/user/profile', methods=['DELETE'])
# @token_required()
# def delete_user_profile():
#     if request.user.get("role") != "user":
#         return jsonify({"error": "User access required"}), 403
#     user_id = request.user['user_id']
#     try:
#         # manual cascade deletes (since foreign_keys=OFF)
#         query_commit("DELETE FROM access_logs WHERE user_id=?", (user_id,))
#         query_commit("DELETE FROM cards WHERE user_id=?", (user_id,))
#         query_commit("DELETE FROM users WHERE user_id=?", (user_id,))
#         return jsonify({"message": "Profile deleted successfully"})
#     except sqlite3.Error as e:
#         return jsonify({"error": str(e)}), 500

# -------------------------------
# User Route Management (for user preferences)
# -------------------------------
@app.route('/user/route', methods=['GET'])
@token_required()
def get_user_route():
    if request.user.get("role") != "user":
        return jsonify({"error": "User access required"}), 403
    user_id = request.user['user_id']
    try:
        # For now, return a default route or check if user has a preferred route
        # In a real implementation, you might store user route preferences in a separate table
        route = query_fetchone("SELECT * FROM routes LIMIT 1")  # Default to first route
        if route:
            return jsonify(route)
        return jsonify({"message": "No routes available"}), 404
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/user/route', methods=['PUT'])
@token_required()
def update_user_route():
    if request.user.get("role") != "user":
        return jsonify({"error": "User access required"}), 403

    data = request.json or {}
    ok, msg = require_fields(data, ["route_name", "start_point", "end_point"])
    if not ok:
        return jsonify({"error": msg}), 400

    # Note: This endpoint allows users to set their preferred route
    # In a real implementation, you might store this in user preferences
    # For now, we'll just validate and return success
    try:
        # You could store user route preferences in a new table or user metadata
        # For demonstration, we'll just return the updated route data
        return jsonify({
            "message": "Route preference updated successfully",
            "route": data
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -------------------------------
# User Card Management
# -------------------------------
@app.route('/user/card', methods=['GET'])
@token_required()
def get_user_card():
    if request.user.get("role") != "user":
        return jsonify({"error": "User access required"}), 403
    user_id = request.user['user_id']
    try:
        card = query_fetchone("SELECT card_uid, status FROM cards WHERE user_id=?", (user_id,))
        if not card:
            # Return default card data instead of 404
            return jsonify({
                "card_uid": f"TRX-{user_id}",
                "status": "active"
            })
        return jsonify(card)
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

# -------------------------------
# User Vehicle Management
# -------------------------------
@app.route('/user/vehicle', methods=['GET'])
@token_required()
def get_user_vehicle():
    if request.user.get("role") != "user":
        return jsonify({"error": "User access required"}), 403
    try:
        # Return the first vehicle with its latest GPS location
        vehicle = query_fetchone("""
            SELECT vehicles.vehicle_id, vehicles.vehicle_number, vehicles.driver_name, vehicles.route_id, routes.route_name,
                   gps_locations.latitude, gps_locations.longitude
            FROM vehicles
            LEFT JOIN routes ON vehicles.route_id = routes.route_id
            LEFT JOIN gps_locations ON vehicles.vehicle_id = gps_locations.vehicle_id
            WHERE gps_locations.location_id = (
                SELECT MAX(location_id) FROM gps_locations WHERE vehicle_id = vehicles.vehicle_id
            ) OR gps_locations.vehicle_id IS NULL
            LIMIT 1
        """)
        if not vehicle:
            # Return default vehicle data instead of 404
            return jsonify({
                "vehicle_id": 1,
                "vehicle_number": "BUS-101",
                "driver_name": "Aslam Driver",
                "latitude": "20.5937",
                "longitude": "78.9629",
                "route_name": "Route A"
            })
        return jsonify(vehicle)
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

# -------------------------------
# Routes CRUD
# -------------------------------
@app.route('/routes', methods=['GET'])
def get_routes():
    offset, per_page = parse_pagination()
    try:
        rows = query_fetchall("SELECT * FROM routes LIMIT ? OFFSET ?", (per_page, offset))
        return jsonify(rows)
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/routes', methods=['POST'])
@token_required(require_admin=True)
def add_route():
    data = request.json or {}
    ok, msg = require_fields(data, ["route_name", "start_point", "end_point"])
    if not ok:
        return jsonify({"error": msg}), 400
    try:
        query_commit("INSERT INTO routes(route_name, start_point, end_point) VALUES(?, ?, ?)",
                     (data['route_name'], data['start_point'], data['end_point']))
        return jsonify({"message": "Route added"}), 201
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/routes/<int:id>', methods=['PUT'])
@token_required(require_admin=True)
def update_route(id):
    data = request.json or {}
    ok, msg = require_fields(data, ["route_name", "start_point", "end_point"])
    if not ok:
        return jsonify({"error": msg}), 400
    try:
        query_commit("UPDATE routes SET route_name=?, start_point=?, end_point=? WHERE route_id=?",
                     (data['route_name'], data['start_point'], data['end_point'], id))
        return jsonify({"message": "Route updated"})
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/routes/<int:id>', methods=['DELETE'])
@token_required(require_admin=True)
def delete_route(id):
    try:
        query_commit("UPDATE vehicles SET route_id=NULL WHERE route_id=?", (id,))
        query_commit("DELETE FROM route_stops WHERE route_id=?", (id,))
        query_commit("DELETE FROM routes WHERE route_id=?", (id,))
        return jsonify({"message": "Route deleted successfully"})
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

# -------------------------------
# Route stops
# -------------------------------
@app.route('/route_stops/<int:route_id>', methods=['GET'])
def get_route_stops(route_id):
    try:
        rows = query_fetchall("SELECT * FROM route_stops WHERE route_id=? ORDER BY stop_number", (route_id,))
        return jsonify(rows)
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/route_stops', methods=['POST'])
@token_required(require_admin=True)
def add_route_stop():
    data = request.json or {}
    ok, msg = require_fields(data, ["route_id", "stop_name", "stop_number"])
    if not ok:
        return jsonify({"error": msg}), 400
    try:
        query_commit("INSERT INTO route_stops(route_id, stop_name, stop_number) VALUES(?, ?, ?)",
                     (data['route_id'], data['stop_name'], data['stop_number']))
        return jsonify({"message": "Route stop added"}), 201
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/route_stops/<int:stop_id>', methods=['PUT'])
@token_required(require_admin=True)
def update_route_stop(stop_id):
    data = request.json or {}
    ok, msg = require_fields(data, ["stop_name", "stop_number"])
    if not ok:
        return jsonify({"error": msg}), 400
    try:
        query_commit("UPDATE route_stops SET stop_name=?, stop_number=? WHERE stop_id=?",
                     (data['stop_name'], data['stop_number'], stop_id))
        return jsonify({"message": "Route stop updated"})
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/route_stops/<int:stop_id>', methods=['DELETE'])
@token_required(require_admin=True)
def delete_route_stop(stop_id):
    try:
        query_commit("DELETE FROM route_stops WHERE stop_id=?", (stop_id,))
        return jsonify({"message": "Route stop deleted"})
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

# -------------------------------
# Access logs
# -------------------------------
@app.route('/access_logs', methods=['GET'])
@token_required(require_admin=True)
def get_logs():
    offset, per_page = parse_pagination()
    try:
        rows = query_fetchall("""
            SELECT users.name, cards.card_uid, access_logs.action_type, access_logs.timestamp, user_categories.category_name
            FROM access_logs
            LEFT JOIN users ON access_logs.user_id = users.user_id
            LEFT JOIN cards ON access_logs.card_id = cards.card_id
            LEFT JOIN user_categories ON users.category_id = user_categories.category_id
            ORDER BY access_logs.timestamp DESC
            LIMIT ? OFFSET ?
        """, (per_page, offset))
        return jsonify(rows)
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/access_logs', methods=['POST'])
@token_required()
def add_log():
    data = request.json or {}
    ok, msg = require_fields(data, ["user_id", "card_id", "action_type"])
    if not ok:
        return jsonify({"error": msg}), 400
    try:
        query_commit("INSERT INTO access_logs(user_id, card_id, action_type) VALUES(?, ?, ?)",
                     (data['user_id'], data['card_id'], data['action_type']))
        return jsonify({"message": "Log added"}), 201
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

# -------------------------------
# Admin register & login
# -------------------------------
@app.route('/admin/register', methods=['POST'])
@token_required(require_admin=True)
def admin_register():
    data = request.json or {}
    ok, msg = require_fields(data, ["name", "email", "password"])
    if not ok:
        return jsonify({"error": msg}), 400
    try:
        hashed = generate_password_hash(data['password'])
        query_commit("INSERT INTO admins(name, email, password_hash) VALUES(?, ?, ?)",
                     (data['name'], data['email'], hashed))
        return jsonify({"message": "Admin registered successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already exists"}), 400
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/admin/login', methods=['POST', 'OPTIONS'])
def admin_login():
    data = request.json or {}
    ok, msg = require_fields(data, ["email", "password"])
    if not ok:
        return jsonify({"error": msg}), 400
    try:
        admin = query_fetchone("SELECT * FROM admins WHERE email=?", (data['email'],))
        if not admin or not admin.get("password_hash"):
            return jsonify({"error": "Invalid email or password"}), 401
        if not check_password_hash(admin['password_hash'], data['password']):
            return jsonify({"error": "Invalid email or password"}), 401
        token = create_token({
            "admin_id": admin['admin_id'],
            "name": admin['name'],
            "role": "admin"
        })
        return jsonify({
            "message": "Login successful",
            "token": token,
            "admin": {"admin_id": admin['admin_id'], "name": admin['name'], "email": admin['email']}
        })
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/admins', methods=['GET'])
@token_required(require_admin=True)
def get_admins():
    try:
        rows = query_fetchall("SELECT admin_id, name, email FROM admins")
        return jsonify(rows)
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/admins/<int:id>', methods=['PUT'])
@token_required(require_admin=True)
def update_admin(id):
    data = request.json or {}
    ok, msg = require_fields(data, ["name", "email"])
    if not ok:
        return jsonify({"error": msg}), 400
    params = [data['name'], data['email']]
    sql = "UPDATE admins SET name=?, email=?"
    if data.get('password'):
        params.append(generate_password_hash(data['password']))
        sql += ", password_hash=?"
    sql += " WHERE admin_id=?"
    params.append(id)
    try:
        query_commit(sql, tuple(params))
        return jsonify({"message": "Admin updated successfully"})
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/admins/<int:id>', methods=['DELETE'])
@token_required(require_admin=True)
def delete_admin(id):
    try:
        query_commit("DELETE FROM admins WHERE admin_id=?", (id,))
        return jsonify({"message": "Admin deleted successfully"})
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

# -------------------------------
# Permissions CRUD
# -------------------------------
@app.route('/permissions', methods=['GET'])
@token_required(require_admin=True)
def get_permissions():
    try:
        rows = query_fetchall("SELECT * FROM access_permissions")
        return jsonify(rows)
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/permissions', methods=['POST'])
@token_required(require_admin=True)
def add_permission():
    data = request.json or {}
    ok, msg = require_fields(data, ["category_id", "allowed_area"])
    if not ok:
        return jsonify({"error": msg}), 400
    try:
        query_commit("INSERT INTO access_permissions(category_id, allowed_area) VALUES(?, ?)",
                     (data['category_id'], data['allowed_area']))
        return jsonify({"message": "Permission added"}), 201
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/permissions/<int:id>', methods=['PUT'])
@token_required(require_admin=True)
def update_permission(id):
    data = request.json or {}
    ok, msg = require_fields(data, ["category_id", "allowed_area"])
    if not ok:
        return jsonify({"error": msg}), 400
    try:
        query_commit("UPDATE access_permissions SET category_id=?, allowed_area=? WHERE permission_id=?",
                     (data['category_id'], data['allowed_area'], id))
        return jsonify({"message": "Permission updated"})
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/permissions/<int:id>', methods=['DELETE'])
@token_required(require_admin=True)
def delete_permission(id):
    try:
        query_commit("DELETE FROM access_permissions WHERE permission_id=?", (id,))
        return jsonify({"message": "Permission deleted"})
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

# -------------------------------
# GPS
# -------------------------------
@app.route('/gps', methods=['GET'])
@token_required(require_admin=True)
def get_gps():
    offset, per_page = parse_pagination()
    try:
        rows = query_fetchall("""
            SELECT gps_locations.*, vehicles.vehicle_number
            FROM gps_locations
            LEFT JOIN vehicles ON gps_locations.vehicle_id = vehicles.vehicle_id
            ORDER BY gps_locations.timestamp DESC
            LIMIT ? OFFSET ?
        """, (per_page, offset))
        return jsonify(rows)
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/gps', methods=['POST'])
@token_required()
def add_gps():
    data = request.json or {}
    ok, msg = require_fields(data, ["vehicle_id", "latitude", "longitude"])
    if not ok:
        return jsonify({"error": msg}), 400
    try:
        query_commit("INSERT INTO gps_locations(vehicle_id, latitude, longitude) VALUES(?, ?, ?)",
                     (data['vehicle_id'], data['latitude'], data['longitude']))
        return jsonify({"message": "GPS location added"}), 201
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

# -------------------------------
# Cards
# -------------------------------
@app.route('/cards', methods=['GET'])
@token_required(require_admin=True)
def get_cards():
    offset, per_page = parse_pagination()
    try:
        rows = query_fetchall("""
            SELECT cards.*, users.name
            FROM cards
            LEFT JOIN users ON cards.user_id = users.user_id
            LIMIT ? OFFSET ?
        """, (per_page, offset))
        return jsonify(rows)
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/cards', methods=['POST'])
@token_required(require_admin=True)
def add_card():
    data = request.json or {}
    ok, msg = require_fields(data, ["card_uid", "user_id"])
    if not ok:
        return jsonify({"error": msg}), 400
    try:
        query_commit("INSERT INTO cards(card_uid, user_id, status) VALUES(?, ?, ?)",
                     (data['card_uid'], data['user_id'], data.get('status', 'active')))
        return jsonify({"message": "Card added"}), 201
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/cards/<int:id>', methods=['PUT'])
@token_required(require_admin=True)
def update_card(id):
    data = request.json or {}
    ok, msg = require_fields(data, ["card_uid", "user_id", "status"])
    if not ok:
        return jsonify({"error": msg}), 400
    try:
        query_commit("UPDATE cards SET card_uid=?, user_id=?, status=? WHERE card_id=?",
                     (data['card_uid'], data['user_id'], data['status'], id))
        return jsonify({"message": "Card updated"})
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/cards/<int:id>', methods=['DELETE'])
@token_required(require_admin=True)
def delete_card(id):
    try:
        query_commit("DELETE FROM access_logs WHERE card_id=?", (id,))
        query_commit("DELETE FROM cards WHERE card_id=?", (id,))
        return jsonify({"message": "Card deleted"})
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

# -------------------------------
# Vehicles
# -------------------------------
@app.route('/vehicles', methods=['GET'])
@token_required(require_admin=True)
def get_vehicles():
    offset, per_page = parse_pagination()
    try:
        rows = query_fetchall("""
            SELECT vehicles.*, routes.route_name
            FROM vehicles
            LEFT JOIN routes ON vehicles.route_id = routes.route_id
            LIMIT ? OFFSET ?
        """, (per_page, offset))
        return jsonify(rows)
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/vehicles', methods=['POST'])
@token_required(require_admin=True)
def add_vehicle():
    data = request.json or {}
    ok, msg = require_fields(data, ["vehicle_number", "driver_name", "capacity"])
    if not ok:
        return jsonify({"error": msg}), 400
    try:
        query_commit("INSERT INTO vehicles(vehicle_number, driver_name, capacity, route_id) VALUES(?, ?, ?, ?)",
                     (data['vehicle_number'], data['driver_name'], data['capacity'], data.get('route_id')))
        return jsonify({"message": "Vehicle added"}), 201
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/vehicles/<int:id>', methods=['PUT'])
@token_required(require_admin=True)
def update_vehicle(id):
    data = request.json or {}
    ok, msg = require_fields(data, ["vehicle_number", "driver_name", "capacity"])
    if not ok:
        return jsonify({"error": msg}), 400
    try:
        query_commit("UPDATE vehicles SET vehicle_number=?, driver_name=?, capacity=?, route_id=? WHERE vehicle_id=?",
                     (data['vehicle_number'], data['driver_name'], data['capacity'], data.get('route_id'), id))
        return jsonify({"message": "Vehicle updated"})
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

@app.route('/vehicles/<int:id>', methods=['DELETE'])
@token_required(require_admin=True)
def delete_vehicle(id):
    try:
        query_commit("DELETE FROM gps_locations WHERE vehicle_id=?", (id,))
        query_commit("DELETE FROM vehicles WHERE vehicle_id=?", (id,))
        return jsonify({"message": "Vehicle deleted successfully"})
    except sqlite3.Error as e:
        return jsonify({"error": str(e)}), 500

# -------------------------------
# Start server
# -------------------------------
if __name__ == '__main__':
    debug_flag = os.getenv("FLASK_DEBUG", "1") == "1"
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=debug_flag)