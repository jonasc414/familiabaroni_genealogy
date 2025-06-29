import os
import uuid
from flask import Blueprint, request, jsonify, send_from_directory
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from src.models.media import MediaFile, PhotoAlbum, AlbumPhoto
from src.database import db

media_bp = Blueprint('media_bp', __name__)

# Configuration
UPLOAD_FOLDER = 'src/static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx', 'txt'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_file_type(filename):
    ext = filename.rsplit('.', 1)[1].lower()
    if ext in ['png', 'jpg', 'jpeg', 'gif']:
        return 'image'
    elif ext in ['pdf', 'doc', 'docx', 'txt']:
        return 'document'
    else:
        return 'other'

@media_bp.route('/upload', methods=['POST'])
@login_required
def upload_file():
    """Upload de arquivo"""
    if 'file' not in request.files:
        return jsonify({'message': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'message': 'File type not allowed'}), 400
    
    # Generate unique filename
    original_filename = secure_filename(file.filename)
    file_extension = original_filename.rsplit('.', 1)[1].lower()
    unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
    
    # Create upload directory if it doesn't exist
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    # Save file
    file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
    file.save(file_path)
    
    # Get file info
    file_size = os.path.getsize(file_path)
    file_type = get_file_type(original_filename)
    
    # Save to database
    media_file = MediaFile(
        user_id=current_user.id,
        filename=unique_filename,
        original_filename=original_filename,
        file_path=file_path,
        file_type=file_type,
        mime_type=file.mimetype or 'application/octet-stream',
        file_size=file_size,
        title=request.form.get('title'),
        description=request.form.get('description'),
        tags=request.form.get('tags'),
        person_id=request.form.get('person_id') if request.form.get('person_id') else None,
        is_public=request.form.get('is_public', 'true').lower() == 'true'
    )
    
    db.session.add(media_file)
    db.session.commit()
    
    return jsonify({
        'message': 'File uploaded successfully',
        'file': media_file.to_dict()
    }), 201

@media_bp.route('/files', methods=['GET'])
@login_required
def get_files():
    """Lista arquivos do usuário"""
    file_type = request.args.get('type')  # image, document, all
    person_id = request.args.get('person_id')
    
    query = MediaFile.query
    
    # Filter by user's files or public files
    query = query.filter(
        (MediaFile.user_id == current_user.id) | (MediaFile.is_public == True)
    )
    
    if file_type and file_type != 'all':
        query = query.filter(MediaFile.file_type == file_type)
    
    if person_id:
        query = query.filter(MediaFile.person_id == person_id)
    
    files = query.order_by(MediaFile.created_at.desc()).all()
    
    return jsonify({
        'files': [file.to_dict() for file in files]
    }), 200

@media_bp.route('/files/<int:file_id>', methods=['GET'])
@login_required
def get_file(file_id):
    """Retorna informações de um arquivo específico"""
    media_file = MediaFile.query.get_or_404(file_id)
    
    # Check permissions
    if not media_file.is_public and media_file.user_id != current_user.id:
        return jsonify({'message': 'Access denied'}), 403
    
    return jsonify({'file': media_file.to_dict()}), 200

@media_bp.route('/files/<int:file_id>', methods=['PUT'])
@login_required
def update_file(file_id):
    """Atualiza informações de um arquivo"""
    media_file = MediaFile.query.get_or_404(file_id)
    
    # Check permissions
    if media_file.user_id != current_user.id:
        return jsonify({'message': 'Access denied'}), 403
    
    data = request.get_json()
    
    media_file.title = data.get('title', media_file.title)
    media_file.description = data.get('description', media_file.description)
    media_file.tags = data.get('tags', media_file.tags)
    media_file.person_id = data.get('person_id', media_file.person_id)
    media_file.is_public = data.get('is_public', media_file.is_public)
    
    db.session.commit()
    
    return jsonify({
        'message': 'File updated successfully',
        'file': media_file.to_dict()
    }), 200

@media_bp.route('/files/<int:file_id>', methods=['DELETE'])
@login_required
def delete_file(file_id):
    """Deleta um arquivo"""
    media_file = MediaFile.query.get_or_404(file_id)
    
    # Check permissions
    if media_file.user_id != current_user.id:
        return jsonify({'message': 'Access denied'}), 403
    
    # Delete physical file
    try:
        if os.path.exists(media_file.file_path):
            os.remove(media_file.file_path)
    except Exception as e:
        print(f"Error deleting file: {e}")
    
    # Delete from database
    db.session.delete(media_file)
    db.session.commit()
    
    return jsonify({'message': 'File deleted successfully'}), 200

@media_bp.route('/serve/<filename>')
def serve_file(filename):
    """Serve uploaded files"""
    return send_from_directory(UPLOAD_FOLDER, filename)

# Album routes
@media_bp.route('/albums', methods=['POST'])
@login_required
def create_album():
    """Cria um novo álbum"""
    data = request.get_json()
    
    album = PhotoAlbum(
        user_id=current_user.id,
        name=data.get('name'),
        description=data.get('description'),
        is_public=data.get('is_public', True)
    )
    
    db.session.add(album)
    db.session.commit()
    
    return jsonify({
        'message': 'Album created successfully',
        'album': {
            'id': album.id,
            'name': album.name,
            'description': album.description,
            'is_public': album.is_public
        }
    }), 201

@media_bp.route('/albums', methods=['GET'])
@login_required
def get_albums():
    """Lista álbuns"""
    albums = PhotoAlbum.query.filter(
        (PhotoAlbum.user_id == current_user.id) | (PhotoAlbum.is_public == True)
    ).order_by(PhotoAlbum.created_at.desc()).all()
    
    result = []
    for album in albums:
        # Count photos in album
        photo_count = AlbumPhoto.query.filter_by(album_id=album.id).count()
        
        result.append({
            'id': album.id,
            'name': album.name,
            'description': album.description,
            'is_public': album.is_public,
            'photo_count': photo_count,
            'created_at': album.created_at.isoformat(),
            'user_name': album.user.name
        })
    
    return jsonify({'albums': result}), 200

@media_bp.route('/albums/<int:album_id>/photos', methods=['POST'])
@login_required
def add_photo_to_album(album_id):
    """Adiciona foto ao álbum"""
    album = PhotoAlbum.query.get_or_404(album_id)
    
    # Check permissions
    if album.user_id != current_user.id:
        return jsonify({'message': 'Access denied'}), 403
    
    data = request.get_json()
    media_file_id = data.get('media_file_id')
    
    # Verify media file exists and is an image
    media_file = MediaFile.query.get_or_404(media_file_id)
    if media_file.file_type != 'image':
        return jsonify({'message': 'Only images can be added to albums'}), 400
    
    # Check if already in album
    existing = AlbumPhoto.query.filter_by(
        album_id=album_id,
        media_file_id=media_file_id
    ).first()
    
    if existing:
        return jsonify({'message': 'Photo already in album'}), 409
    
    # Add to album
    album_photo = AlbumPhoto(
        album_id=album_id,
        media_file_id=media_file_id,
        order_index=data.get('order_index', 0)
    )
    
    db.session.add(album_photo)
    db.session.commit()
    
    return jsonify({'message': 'Photo added to album successfully'}), 201

@media_bp.route('/albums/<int:album_id>/photos', methods=['GET'])
@login_required
def get_album_photos(album_id):
    """Lista fotos do álbum"""
    album = PhotoAlbum.query.get_or_404(album_id)
    
    # Check permissions
    if not album.is_public and album.user_id != current_user.id:
        return jsonify({'message': 'Access denied'}), 403
    
    album_photos = AlbumPhoto.query.filter_by(album_id=album_id).order_by(AlbumPhoto.order_index).all()
    
    photos = []
    for ap in album_photos:
        photo_data = ap.media_file.to_dict()
        photo_data['order_index'] = ap.order_index
        photos.append(photo_data)
    
    return jsonify({
        'album': {
            'id': album.id,
            'name': album.name,
            'description': album.description
        },
        'photos': photos
    }), 200

