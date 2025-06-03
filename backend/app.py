from flask import Flask, request, jsonify, g
from flask_cors import CORS
import jwt
import os
from datetime import datetime, timedelta, timezone
import json
from functools import wraps

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes

# JWT Configuration
# IMPORTANT: In a production environment, JWT_SECRET_KEY should be a strong, random key
# and ideally managed through environment variables or a secure configuration system.
# Do NOT use this default key in production.
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-default-super-secret-key-for-dev')
JWT_ALGORITHM = 'HS256'
# Token expiration time in seconds (default: 1 hour for demo)
JWT_EXPIRATION_SECONDS = int(os.environ.get('JWT_EXPIRATION_SECONDS', 3600))

# Book Data Loading
BOOKS_FILE_PATH = os.path.join(os.path.dirname(__file__), 'books.json')
ALL_BOOKS = [] # In-memory cache for books

# --- Reading State Data Storage (In-Memory) ---
USER_READING_STATES = {} # Key: userId, Value: {bookId: {paragraphIndex: X, last_updated: timestamp}}

def load_books_from_json():
    """Loads book data from the JSON file into the ALL_BOOKS list."""
    global ALL_BOOKS
    try:
        with open(BOOKS_FILE_PATH, 'r', encoding='utf-8') as f:
            ALL_BOOKS = json.load(f)
        app.logger.info(f"Successfully loaded {len(ALL_BOOKS)} books from {BOOKS_FILE_PATH}")
    except FileNotFoundError:
        app.logger.error(f"Books data file not found: {BOOKS_FILE_PATH}. Please create it.")
        ALL_BOOKS = [] # Ensure it's empty if file not found
    except json.JSONDecodeError as e:
        app.logger.error(f"Error decoding JSON from {BOOKS_FILE_PATH}: {e}")
        ALL_BOOKS = []
    except Exception as e:
        app.logger.error(f"An unexpected error occurred while loading books: {e}")
        ALL_BOOKS = []

# Load books when the app starts
with app.app_context():
    load_books_from_json()

# JWT Verification Decorator
def token_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                token = parts[1]
            elif len(parts) == 1: # Allow token directly for simplicity if Bearer is missed
                token = parts[0]

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            # Decode the token using the secret key and algorithm
            data = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            # Store decoded payload in Flask's g object for access in the route
            g.current_user_claims = data 
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError as e:
            app.logger.error(f"Invalid token: {e}")
            return jsonify({'message': 'Token is invalid!'}), 401
        except Exception as e:
            app.logger.error(f"Token processing error: {e}")
            return jsonify({'message': 'Error processing token'}), 401
            
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def home():
    return "Welcome to the ReadiT Backend!"

@app.route('/token', methods=['POST'])
def create_token():
    data = request.get_json()
    if not data:
        return jsonify({"message": "Request body must be JSON"}), 400

    role = data.get('role')
    permissions = data.get('permissions')
    user_id = data.get('userId', 'demo_user')

    if not role and not permissions:
        return jsonify({"message": "Either 'role' or 'permissions' must be provided"}), 400

    payload = {
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + timedelta(seconds=JWT_EXPIRATION_SECONDS),
        'sub': user_id,
    }
    if role: payload['role'] = role
    if permissions: payload['permissions'] = permissions
    
    if not JWT_SECRET_KEY or JWT_SECRET_KEY == 'your-default-super-secret-key-for-dev':
        # Added a check for the default key for better security feedback during dev
        app.logger.warning("JWT_SECRET_KEY is not configured or is using the default insecure key. Please set a strong secret key.")
        if not JWT_SECRET_KEY: # Only return 500 if it's truly not set
             return jsonify({"message": "Internal server error: JWT secret not configured"}), 500

    try:
        encoded_jwt = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return jsonify({'token': encoded_jwt})
    except Exception as e:
        app.logger.error(f"Error generating JWT: {str(e)}")
        return jsonify({"message": "Error generating token"}), 500

# --- Book API Routes ---
@app.route('/api/books', methods=['GET'])
@token_required
def get_books():
    # g.current_user_claims is available here if needed
    app.logger.info(f"User {g.current_user_claims.get('sub')} accessing /api/books")

    # Pagination parameters
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        if page < 1: page = 1
        if limit < 1: limit = 1
        # Optional: Add a maximum limit
        # if limit > 100: limit = 100 
    except ValueError:
        return jsonify({'message': 'Invalid pagination parameters. Page and limit must be integers.'}), 400

    start_index = (page - 1) * limit
    end_index = start_index + limit

    paginated_books = ALL_BOOKS[start_index:end_index]
    total_books = len(ALL_BOOKS)
    total_pages = (total_books + limit - 1) // limit # Ceiling division

    response = {
        'message': 'Books retrieved successfully.',
        'data': paginated_books,
        'pagination': {
            'currentPage': page,
            'limit': limit,
            'totalPages': total_pages,
            'totalItems': total_books,
            'hasNextPage': page < total_pages,
            'hasPreviousPage': page > 1
        }
    }
    return jsonify(response), 200

@app.route('/api/books/<string:book_id>', methods=['GET'])
@token_required
def get_book_by_id(book_id):
    # g.current_user_claims is available here if needed
    app.logger.info(f"User {g.current_user_claims.get('sub')} accessing /api/books/{book_id}")

    book = next((b for b in ALL_BOOKS if b.get('id') == book_id), None)

    if book:
        return jsonify({'message': 'Book found.', 'data': book}), 200
    else:
        return jsonify({'message': 'Book not found.'}), 404

# --- Reading State API Routes ---
@app.route('/api/readingstates/<string:book_id>', methods=['GET'])
@token_required
def get_reading_state(book_id):
    user_id = g.current_user_claims.get('sub')
    if not user_id:
        # This should ideally not happen if token_required is effective and sub is always in token
        return jsonify({'message': 'User ID not found in token.'}), 401 

    app.logger.info(f"User {user_id} requesting reading state for book {book_id}")

    # Check if the book exists
    book_exists = any(b.get('id') == book_id for b in ALL_BOOKS)
    if not book_exists:
        return jsonify({'message': f'Book with id {book_id} not found.'}), 404

    user_states = USER_READING_STATES.get(user_id, {})
    book_state = user_states.get(book_id)

    if book_state:
        return jsonify({'message': 'Reading state retrieved.', 'data': book_state}), 200
    else:
        # Return a default state or indicate no state found for this book for this user
        return jsonify({'message': 'No reading state found for this book.', 'data': {'paragraphIndex': 0, 'bookId': book_id}}), 200 # Or 404, depending on desired UX

@app.route('/api/readingstates/<string:book_id>', methods=['PUT'])
@token_required
def update_reading_state(book_id):
    user_id = g.current_user_claims.get('sub')
    if not user_id:
        return jsonify({'message': 'User ID not found in token.'}), 401

    data = request.get_json()
    if not data or 'paragraphIndex' not in data:
        return jsonify({'message': 'Missing paragraphIndex in request body.'}), 400

    try:
        paragraph_index = int(data['paragraphIndex'])
        if paragraph_index < 0:
             return jsonify({'message': 'paragraphIndex must be a non-negative integer.'}), 400
    except ValueError:
        return jsonify({'message': 'paragraphIndex must be an integer.'}), 400

    app.logger.info(f"User {user_id} updating reading state for book {book_id} to paragraph {paragraph_index}")

    # Check if the book exists
    book_exists = any(b.get('id') == book_id for b in ALL_BOOKS)
    if not book_exists:
        return jsonify({'message': f'Book with id {book_id} not found.'}), 404

    if user_id not in USER_READING_STATES:
        USER_READING_STATES[user_id] = {}
    
    current_time = datetime.now(timezone.utc).isoformat()
    new_state = {
        'bookId': book_id,
        'paragraphIndex': paragraph_index,
        'last_updated': current_time
    }
    USER_READING_STATES[user_id][book_id] = new_state

    # Determine if it was a create (201) or update (200)
    # For simplicity, always returning 200 for PUT, as it's idempotent for state setting.
    # Or, could check if book_id was previously in USER_READING_STATES[user_id]
    return jsonify({'message': 'Reading state updated.', 'data': new_state}), 200

if __name__ == '__main__':
    # For local development, it's often useful to set a default port.
    # The host '0.0.0.0' makes the server accessible from other devices on the network.
    port = int(os.environ.get('FLASK_RUN_PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port) 