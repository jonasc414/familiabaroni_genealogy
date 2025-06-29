from src.database import db
from datetime import datetime

class MediaFile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    person_id = db.Column(db.Integer, db.ForeignKey('person.id'), nullable=True)
    filename = db.Column(db.String(200), nullable=False)
    original_filename = db.Column(db.String(200), nullable=False)
    file_path = db.Column(db.String(300), nullable=False)
    file_type = db.Column(db.String(50), nullable=False)  # image, document, video
    mime_type = db.Column(db.String(100), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(200), nullable=True)
    description = db.Column(db.Text, nullable=True)
    tags = db.Column(db.String(500), nullable=True)  # comma-separated tags
    is_public = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='media_files')
    person = db.relationship('Person', backref='media_files')
    
    def __repr__(self):
        return f'<MediaFile {self.filename}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'person_id': self.person_id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_path': self.file_path,
            'file_type': self.file_type,
            'mime_type': self.mime_type,
            'file_size': self.file_size,
            'title': self.title,
            'description': self.description,
            'tags': self.tags.split(',') if self.tags else [],
            'is_public': self.is_public,
            'created_at': self.created_at.isoformat(),
            'user_name': self.user.name if self.user else None,
            'person_name': self.person.name if self.person else None
        }

class PhotoAlbum(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    cover_photo_id = db.Column(db.Integer, db.ForeignKey('media_file.id'), nullable=True)
    is_public = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='photo_albums')
    cover_photo = db.relationship('MediaFile', foreign_keys=[cover_photo_id])
    
    def __repr__(self):
        return f'<PhotoAlbum {self.name}>'

class AlbumPhoto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    album_id = db.Column(db.Integer, db.ForeignKey('photo_album.id'), nullable=False)
    media_file_id = db.Column(db.Integer, db.ForeignKey('media_file.id'), nullable=False)
    order_index = db.Column(db.Integer, default=0)
    added_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    album = db.relationship('PhotoAlbum', backref='album_photos')
    media_file = db.relationship('MediaFile', backref='album_associations')
    
    # Unique constraint
    __table_args__ = (db.UniqueConstraint('album_id', 'media_file_id', name='unique_album_photo'),)

