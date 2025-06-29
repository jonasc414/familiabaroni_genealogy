from src.database import db
from datetime import datetime

class Person(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    birth_date = db.Column(db.String(10), nullable=True)
    birth_place = db.Column(db.String(200), nullable=True)
    death_date = db.Column(db.String(10), nullable=True)
    death_place = db.Column(db.String(200), nullable=True)
    gender = db.Column(db.String(1), nullable=True)  # M or F
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    father_id = db.Column(db.Integer, db.ForeignKey('person.id'), nullable=True)
    mother_id = db.Column(db.Integer, db.ForeignKey('person.id'), nullable=True)
    
    # Self-referential relationships
    father = db.relationship('Person', remote_side=[id], foreign_keys=[father_id], backref='children_as_father')
    mother = db.relationship('Person', remote_side=[id], foreign_keys=[mother_id], backref='children_as_mother')
    
    def __repr__(self):
        return f'<Person {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'birth_date': self.birth_date,
            'birth_place': self.birth_place,
            'death_date': self.death_date,
            'death_place': self.death_place,
            'gender': self.gender,
            'notes': self.notes,
            'father_id': self.father_id,
            'mother_id': self.mother_id
        }

