from src.database import db
from datetime import datetime

class UserProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, unique=True)
    bio = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(200), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    website = db.Column(db.String(200), nullable=True)
    profile_picture = db.Column(db.String(200), nullable=True)
    is_premium = db.Column(db.Boolean, default=False)
    privacy_level = db.Column(db.String(20), default='public')  # public, family, private
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = db.relationship('User', backref='profile')
    
    def __repr__(self):
        return f'<UserProfile {self.user_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'bio': self.bio,
            'location': self.location,
            'phone': self.phone,
            'website': self.website,
            'profile_picture': self.profile_picture,
            'is_premium': self.is_premium,
            'privacy_level': self.privacy_level
        }

class FamilyConnection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user1_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user2_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    relationship_type = db.Column(db.String(50), nullable=True)  # cousin, uncle, aunt, etc.
    status = db.Column(db.String(20), default='pending')  # pending, accepted, blocked
    requested_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    accepted_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    user1 = db.relationship('User', foreign_keys=[user1_id], backref='connections_as_user1')
    user2 = db.relationship('User', foreign_keys=[user2_id], backref='connections_as_user2')
    requester = db.relationship('User', foreign_keys=[requested_by])
    
    def __repr__(self):
        return f'<FamilyConnection {self.user1_id}-{self.user2_id}>'

class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    post_type = db.Column(db.String(20), default='text')  # text, photo, document
    attachment_path = db.Column(db.String(200), nullable=True)
    visibility = db.Column(db.String(20), default='family')  # public, family, private
    likes_count = db.Column(db.Integer, default=0)
    comments_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = db.relationship('User', backref='posts')
    
    def __repr__(self):
        return f'<Post {self.id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.name,
            'content': self.content,
            'post_type': self.post_type,
            'attachment_path': self.attachment_path,
            'visibility': self.visibility,
            'likes_count': self.likes_count,
            'comments_count': self.comments_count,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class PostLike(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    post = db.relationship('Post', backref='likes')
    user = db.relationship('User', backref='liked_posts')
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('post_id', 'user_id', name='unique_post_like'),)

class PostComment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    post = db.relationship('Post', backref='comments')
    user = db.relationship('User', backref='comments')
    
    def to_dict(self):
        return {
            'id': self.id,
            'post_id': self.post_id,
            'user_id': self.user_id,
            'user_name': self.user.name,
            'content': self.content,
            'created_at': self.created_at.isoformat()
        }

