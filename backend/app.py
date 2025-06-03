from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import os
from datetime import datetime, timedelta, timezone

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


@app.route('/')
def home():
    return "Welcome to the ReadiT Backend!"

@app.route('/token', methods=['POST'])
def create_token():
    data = request.get_json()

    if not data:
        return jsonify({"message": "Request body must be JSON"}), 400

    # For this demo, we'll accept 'role' or 'permissions' directly.
    # In a real app, you'd typically authenticate a user first (e.g., with username/password)
    # and then issue a token containing their user ID and roles/permissions.
    
    role = data.get('role')
    permissions = data.get('permissions')
    user_id = data.get('userId', 'demo_user') # Example: allow passing a userId or use a default

    if not role and not permissions:
        # Depending on your auth model, you might require a specific claim.
        # For this example, we'll allow tokens with just a user_id if no role/permissions are given,
        # or you could enforce that at least one custom claim is present.
        # Let's require at least a role or permissions for this example.
        return jsonify({"message": "Either 'role' or 'permissions' must be provided in the request body"}), 400

    payload = {
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + timedelta(seconds=JWT_EXPIRATION_SECONDS),
        'sub': user_id,  # Subject claim (typically user ID)
    }

    if role:
        payload['role'] = role
    if permissions:
        payload['permissions'] = permissions
    
    if not JWT_SECRET_KEY:
        # This case should ideally not be hit if a default is provided or env var is set.
        # Log this as a server configuration error.
        app.logger.error("JWT_SECRET_KEY is not configured.")
        return jsonify({"message": "Internal server error: JWT secret not configured"}), 500

    try:
        encoded_jwt = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return jsonify({'token': encoded_jwt})
    except Exception as e:
        app.logger.error(f"Error generating JWT: {str(e)}")
        return jsonify({"message": "Error generating token"}), 500


if __name__ == '__main__':
    # For local development, it's often useful to set a default port.
    # The host '0.0.0.0' makes the server accessible from other devices on the network.
    port = int(os.environ.get('FLASK_RUN_PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port) 