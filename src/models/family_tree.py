from src.database import db
from datetime import datetime

class FamilyTree(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # Nome da família/árvore
    description = db.Column(db.Text, nullable=True)
    root_person_id = db.Column(db.Integer, db.ForeignKey('person.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to root person
    root_person = db.relationship('Person', backref='family_trees_as_root')
    
    def __repr__(self):
        return f'<FamilyTree {self.name}>'

class UserPersonConnection(db.Model):
    """Tabela para conectar usuários registrados com pessoas na árvore genealógica"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    person_id = db.Column(db.Integer, db.ForeignKey('person.id'), nullable=False)
    relationship_type = db.Column(db.String(50), nullable=True)  # 'self', 'father', 'mother', etc.
    verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='person_connections')
    person = db.relationship('Person', backref='user_connections')
    
    def __repr__(self):
        return f'<UserPersonConnection User:{self.user_id} Person:{self.person_id}>'

