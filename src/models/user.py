from src.database import db
from flask_login import UserMixin

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    birth_date = db.Column(db.String(10), nullable=False)
    # Optional fields for parents, grandparents, great-grandparents
    father_name = db.Column(db.String(100), nullable=True)
    mother_name = db.Column(db.String(100), nullable=True)
    grandfather_paternal_name = db.Column(db.String(100), nullable=True)
    grandmother_paternal_name = db.Column(db.String(100), nullable=True)
    grandfather_maternal_name = db.Column(db.String(100), nullable=True)
    grandmother_maternal_name = db.Column(db.String(100), nullable=True)
    great_grandfather_paternal_paternal_name = db.Column(db.String(100), nullable=True)
    great_grandmother_paternal_paternal_name = db.Column(db.String(100), nullable=True)
    great_grandfather_paternal_maternal_name = db.Column(db.String(100), nullable=True)
    great_grandmother_paternal_maternal_name = db.Column(db.String(100), nullable=True)
    great_grandfather_maternal_paternal_name = db.Column(db.String(100), nullable=True)
    great_grandmother_maternal_paternal_name = db.Column(db.String(100), nullable=True)
    great_grandfather_maternal_maternal_name = db.Column(db.String(100), nullable=True)
    great_grandmother_maternal_maternal_name = db.Column(db.String(100), nullable=True)

    def __repr__(self):
        return f'<User {self.email}>'


