from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes

@app.route('/')
def home():
    return "Welcome to the ReadiT Backend!"

if __name__ == '__main__':
    # Port configuration will be handled later if needed directly in run command
    app.run(debug=True, port=5000) 