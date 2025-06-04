# ReadiT - Ebook Reader Application

ReadiT is a web-based application designed for an enhanced ebook reading experience, allowing users to upload, read, and manage their digital books with features like highlighting, bookmarking, and personalized reading states.

## Features

### Frontend (Vue.js)

-   **Ebook Reading Interface**: Upload and read EPUB books seamlessly.
-   **Text Highlighting**: Select and save important text passages.
-   **Highlight Management**: Visually re-apply and manage saved highlights.
-   **Custom Highlight Colors**: Personalize highlight colors to your preference.
-   **Theme Customization**: Toggle between Dark and Light mode for comfortable reading.
-   **Navigation**: Smooth chapter navigation and pagination within ebooks.
-   **Font Customization**: Adjust font size for optimal readability.
-   **Responsive Design**: Adapts to various screen sizes for a consistent experience.
-   **PWA Ready**: Basic Progressive Web App features for offline access and installability.
-   **Reading State**: Saves and restores your current reading position in a book.

### Backend (Python/Flask)

-   **Reading State Management**: CRUD operations to save and retrieve user reading progress per book.
-   **Bookmarks & Highlights**: Robust API for creating, retrieving, updating, and deleting user highlights and bookmarks.
-   **User-Specific Data**: Endpoints are designed to handle data for individual users (further authentication can be integrated).

## App Structure

### Frontend Routes (Vue Router)

-   `/`: Main view, likely for book selection and management.
-   `/reader/:bookFileName`: The primary view for reading an ebook.
-   (Other routes as defined for settings, user profiles, etc.)

### Backend Endpoints (Flask)

-   **Reading States**:
    -   `POST /reading_states`: Create a new reading state.
    -   `GET /reading_states/<user_id>/<book_id>`: Retrieve reading state for a specific user and book.
    -   `PUT /reading_states/<id>`: Update an existing reading state.
    -   `DELETE /reading_states/<id>`: Delete a reading state.
-   **Highlights/Bookmarks**:
    -   `POST /highlights`: Create a new highlight or bookmark.
    -   `GET /highlights/<user_id>/<book_id>`: Retrieve all highlights for a specific user and book.
    -   `GET /highlights/<highlight_id>`: Retrieve a specific highlight.
    -   `PUT /highlights/<highlight_id>`: Update an existing highlight.
    -   `DELETE /highlights/<highlight_id>`: Delete a highlight.

## Technical Stack

### Frontend (Vue.js)

-   **Framework**: Vue 3
-   **Build Tool**: Vite
-   **Routing**: Vue Router
-   **State Management**: Pinia
-   **Ebook Rendering**: EPUB.js
-   **Styling**: (Likely Tailwind CSS or custom CSS/SCSS - to be specified)
-   **PWA**: `vite-plugin-pwa`

### Backend (Python/Flask)

-   **Framework**: Flask
-   **ORM**: Flask-SQLAlchemy
-   **Database**: SQLite (default, configurable)
-   **API Development**: Flask routes (Flask-RESTful can be integrated for more complex APIs)

## Getting Started

### Prerequisites

-   Node.js and npm (for Frontend)
-   Python and pip (for Backend)

### Frontend Setup

1.  Navigate to the frontend directory (usually `readit-app` or `readit-app/src` - adjust as per your structure, assuming `readit-app` is the root for the Vue project):
    ```bash
    cd path/to/your/frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment variables (create a `.env` file if needed):
    Example: `VITE_API_URL=http://localhost:5000/api`
4.  Run the development server:
    ```bash
    npm run dev
    ```

### Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd readit-app/backend
    ```
2.  Create a virtual environment (recommended):
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Configure environment variables (e.g., in a `.env` file or system variables):
    -   `FLASK_APP=app.py`
    -   `FLASK_ENV=development`
    -   `DATABASE_URL=sqlite:///readit.db`
5.  Initialize the database (if applicable, based on your `app.py` setup):
    ```bash
    flask db init  # If using Flask-Migrate
    flask db migrate
    flask db upgrade
    ```
    Or ensure `db.create_all()` is called appropriately in your app.
6.  Run the development server:
    ```bash
    flask run
    ```

## How to Use

1.  **Upload Books**: Access the application and upload your EPUB files.
2.  **Open a Book**: Select a book from your library to start reading.
3.  **Reading**:
    -   Navigate through chapters and pages.
    -   Adjust font size to your comfort.
    -   Select text to create highlights.
    -   Choose custom colors for your highlights.
    -   Your reading progress is automatically saved.
4.  **Themes**: Switch between light and dark themes using the theme toggle.

## Deployment

[ReadiT Website](https://683f254574aba722767ab7de--readit-book.netlify.app/)

## Security Features

- JWT token
- Access Management

## Learn More

-   [Vue.js Documentation](https://vuejs.org/)
-   [Vite Documentation](https://vitejs.dev/)
-   [Pinia Documentation](https://pinia.vuejs.org/)
-   [Flask Documentation](https://flask.palletsprojects.com/)
-   [Flask-SQLAlchemy Documentation](https://flask-sqlalchemy.palletsprojects.com/)
