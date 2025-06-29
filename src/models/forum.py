from src.database import db
from datetime import datetime

class ForumCategory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category_type = db.Column(db.String(50), nullable=False)  # location, surname, ancestry
    icon = db.Column(db.String(50), default='fas fa-folder')
    color = db.Column(db.String(7), default='#007bff')  # hex color
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ForumCategory {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category_type': self.category_type,
            'icon': self.icon,
            'color': self.color,
            'is_active': self.is_active,
            'topic_count': ForumTopic.query.filter_by(category_id=self.id).count(),
            'post_count': db.session.query(ForumPost).join(ForumTopic).filter(ForumTopic.category_id == self.id).count()
        }

class ForumTopic(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('forum_category.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_pinned = db.Column(db.Boolean, default=False)
    is_locked = db.Column(db.Boolean, default=False)
    views_count = db.Column(db.Integer, default=0)
    posts_count = db.Column(db.Integer, default=0)
    last_post_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_post_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    category = db.relationship('ForumCategory', backref='topics')
    user = db.relationship('User', foreign_keys=[user_id], backref='forum_topics')
    last_post_user = db.relationship('User', foreign_keys=[last_post_user_id])
    
    def __repr__(self):
        return f'<ForumTopic {self.title}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'category_id': self.category_id,
            'user_id': self.user_id,
            'title': self.title,
            'content': self.content,
            'is_pinned': self.is_pinned,
            'is_locked': self.is_locked,
            'views_count': self.views_count,
            'posts_count': self.posts_count,
            'last_post_at': self.last_post_at.isoformat() if self.last_post_at else None,
            'created_at': self.created_at.isoformat(),
            'user_name': self.user.name,
            'last_post_user_name': self.last_post_user.name if self.last_post_user else None
        }

class ForumPost(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    topic_id = db.Column(db.Integer, db.ForeignKey('forum_topic.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_edited = db.Column(db.Boolean, default=False)
    edited_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    topic = db.relationship('ForumTopic', backref='posts')
    user = db.relationship('User', backref='forum_posts')
    
    def __repr__(self):
        return f'<ForumPost {self.id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'topic_id': self.topic_id,
            'user_id': self.user_id,
            'content': self.content,
            'is_edited': self.is_edited,
            'edited_at': self.edited_at.isoformat() if self.edited_at else None,
            'created_at': self.created_at.isoformat(),
            'user_name': self.user.name
        }

class GuestbookEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # Can be null for anonymous entries
    name = db.Column(db.String(100), nullable=False)  # For anonymous entries
    email = db.Column(db.String(120), nullable=True)  # For anonymous entries
    message = db.Column(db.Text, nullable=False)
    is_approved = db.Column(db.Boolean, default=True)  # For moderation
    is_anonymous = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    user = db.relationship('User', backref='guestbook_entries')
    
    def __repr__(self):
        return f'<GuestbookEntry {self.id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.user.name if self.user else self.name,
            'message': self.message,
            'is_approved': self.is_approved,
            'is_anonymous': self.is_anonymous,
            'created_at': self.created_at.isoformat()
        }

