import os
from dotenv import load_dotenv

# Load environment variables from .env or .env.local if present
load_dotenv('.env.local')
load_dotenv()

class Config:
    MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/')
    MONGO_DB = os.environ.get('MONGO_DB', 'poona_dash')
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
