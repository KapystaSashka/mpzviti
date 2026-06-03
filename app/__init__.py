import os
from flask import Flask
from flask_cors import CORS
from app.database import db, seed_db
from app.routes import api_bp


def create_app():
    app = Flask(__name__)
    CORS(app)

    # SQLite — файл mpz.db в корені проєкту
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(base_dir, 'mpz.db')}"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    with app.app_context():
        db.create_all()
        seed_db()

    app.register_blueprint(api_bp)
    return app
