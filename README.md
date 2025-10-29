# Adolat AI - Integrated Frontend and Backend

This repository contains the complete Adolat AI legal assistant application with integrated frontend (React/TypeScript) and backend (Django REST Framework).

## Features

- AI-powered legal analysis and strategy generation
- Case management system
- Document analysis and classification
- Task and timeline tracking
- Evidence management
- Billing and pricing tools
- Research assistant
- Court simulation
- Multi-language support (Uzbek, Russian, English)
- Device limit enforcement (2 devices maximum)
- User profile management
- Voice memo recording and management

## Prerequisites

- Python 3.8 or higher
- Node.js 14 or higher
- npm 6 or higher

## Installation

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Run database migrations:
   ```bash
   python manage.py migrate
   ```

6. Create a superuser (optional):
   ```bash
   python manage.py createsuperuser
   ```

### Frontend Setup

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

## Running the Application

### Start the Backend Server

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Activate the virtual environment (if not already activated)

3. Start the Django development server:
   ```bash
   python manage.py runserver
   ```

   The backend API will be available at: http://127.0.0.1:8000/

### Start the Frontend Development Server

1. In a new terminal, navigate to the root directory

2. Start the Vite development server:
   ```bash
   npm run dev
   ```

   The frontend will be available at: http://localhost:3000/

## Usage

1. Open your browser and navigate to http://localhost:3000
2. Login using any token (e.g., "AD2025")
3. Accept the terms and conditions
4. Start analyzing legal cases using the AI-powered tools

## API Documentation

The backend API documentation is available at: http://127.0.0.1:8000/api/docs/

## Admin Panel

The Django admin panel is available at: http://127.0.0.1:8000/admin/
Use the superuser credentials created during setup to access it.

## Project Structure

```
├── backend/                 # Django backend
│   ├── adolat_ai_backend/   # Main Django project
│   ├── users/              # User management app
│   ├── cases/              # Case management app
│   ├── manage.py           # Django management script
│   └── requirements.txt    # Python dependencies
├── components/             # React components
├── services/               # Service modules (API, AI)
├── App.tsx                 # Main React application
├── types.ts                # TypeScript type definitions
├── translations.ts         # Translation strings
└── vite.config.ts          # Vite configuration
```

## Integration Details

The frontend and backend are integrated using:
- JWT token-based authentication
- RESTful API endpoints
- Device management with 2-device limit
- Real-time data synchronization
- Fallback to localStorage when offline

For detailed integration documentation, see [INTEGRATION_DOCUMENTATION.md](INTEGRATION_DOCUMENTATION.md)

## Audio Recording Functionality

The application includes voice memo recording capabilities:

### Features:
- Record voice memos using the device microphone
- Save recordings as audio files
- Integrate recordings with case files
- Play back recorded memos
- Download recordings

### Technical Implementation:
- Uses MediaRecorder API for reliable recording
- Stores recordings as WebM format audio files
- Converts recordings to CaseFile objects for integration
- Provides visual feedback during recording

For detailed audio recording documentation, see [AUDIO_RECORDING_DOCUMENTATION.md](AUDIO_RECORDING_DOCUMENTATION.md)

## Development

### Backend Development

- Models are defined in `backend/users/models.py` and `backend/cases/models.py`
- Serializers in `backend/users/serializers.py` and `backend/cases/serializers.py`
- Views in `backend/users/views.py` and `backend/cases/views.py`
- URLs in `backend/users/urls.py` and `backend/cases/urls.py`

### Frontend Development

- Main application logic in `App.tsx`
- Components in the `components/` directory
- API service in `services/apiService.ts`
- AI service in `services/geminiService.ts`
- Audio service in `services/audioService.ts`

## Testing

### Backend Testing

Run Django tests:
```bash
cd backend
python manage.py test
```

### Frontend Testing

Run integration tests:
```bash
node test_integration.js
```

## Deployment

### Backend Deployment

1. Set environment variables:
   - `SECRET_KEY` - Django secret key
   - `DEBUG` - Set to False for production
   - Database settings as needed

2. Run migrations:
   ```bash
   python manage.py migrate
   ```

3. Collect static files:
   ```bash
   python manage.py collectstatic
   ```

4. Use a production WSGI server like Gunicorn:
   ```bash
   gunicorn adolat_ai_backend.wsgi:application
   ```

### Frontend Deployment

1. Build the production version:
   ```bash
   npm run build
   ```

2. Serve the built files using a web server like Nginx

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact the development team or open an issue on GitHub.