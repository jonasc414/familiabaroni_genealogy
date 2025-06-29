from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from src.models.social import UserProfile, FamilyConnection, Post, PostLike, PostComment
from src.models.user import User
from src.database import db
from datetime import datetime

social_bp = Blueprint('social_bp', __name__)

# Profile routes
@social_bp.route('/profile/create', methods=['POST'])
@login_required
def create_profile():
    """Cria ou atualiza o perfil do usuário"""
    data = request.get_json()
    
    # Verifica se já existe um perfil
    profile = UserProfile.query.filter_by(user_id=current_user.id).first()
    
    if profile:
        # Atualiza perfil existente
        profile.bio = data.get('bio', profile.bio)
        profile.location = data.get('location', profile.location)
        profile.phone = data.get('phone', profile.phone)
        profile.website = data.get('website', profile.website)
        profile.privacy_level = data.get('privacy_level', profile.privacy_level)
        profile.updated_at = datetime.utcnow()
    else:
        # Cria novo perfil
        profile = UserProfile(
            user_id=current_user.id,
            bio=data.get('bio'),
            location=data.get('location'),
            phone=data.get('phone'),
            website=data.get('website'),
            privacy_level=data.get('privacy_level', 'public')
        )
        db.session.add(profile)
    
    db.session.commit()
    return jsonify({'message': 'Profile updated successfully', 'profile': profile.to_dict()}), 200

@social_bp.route('/profile/<int:user_id>', methods=['GET'])
@login_required
def get_profile(user_id):
    """Retorna o perfil de um usuário"""
    user = User.query.get_or_404(user_id)
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    
    # Verifica se o usuário pode ver este perfil
    if profile and profile.privacy_level == 'private' and user_id != current_user.id:
        return jsonify({'message': 'Profile is private'}), 403
    
    result = {
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email if user_id == current_user.id else None
        },
        'profile': profile.to_dict() if profile else None
    }
    
    return jsonify(result), 200

# Connection routes
@social_bp.route('/connections/request', methods=['POST'])
@login_required
def request_connection():
    """Solicita conexão com outro usuário"""
    data = request.get_json()
    target_user_id = data.get('user_id')
    relationship_type = data.get('relationship_type', 'family')
    
    if target_user_id == current_user.id:
        return jsonify({'message': 'Cannot connect to yourself'}), 400
    
    # Verifica se o usuário existe
    target_user = User.query.get_or_404(target_user_id)
    
    # Verifica se já existe uma conexão
    existing_connection = FamilyConnection.query.filter(
        ((FamilyConnection.user1_id == current_user.id) & (FamilyConnection.user2_id == target_user_id)) |
        ((FamilyConnection.user1_id == target_user_id) & (FamilyConnection.user2_id == current_user.id))
    ).first()
    
    if existing_connection:
        return jsonify({'message': 'Connection already exists'}), 409
    
    # Cria nova solicitação de conexão
    connection = FamilyConnection(
        user1_id=current_user.id,
        user2_id=target_user_id,
        relationship_type=relationship_type,
        requested_by=current_user.id
    )
    
    db.session.add(connection)
    db.session.commit()
    
    return jsonify({'message': 'Connection request sent successfully'}), 201

@social_bp.route('/connections/accept/<int:connection_id>', methods=['POST'])
@login_required
def accept_connection(connection_id):
    """Aceita uma solicitação de conexão"""
    connection = FamilyConnection.query.get_or_404(connection_id)
    
    # Verifica se o usuário atual pode aceitar esta conexão
    if connection.user2_id != current_user.id:
        return jsonify({'message': 'Unauthorized'}), 403
    
    if connection.status != 'pending':
        return jsonify({'message': 'Connection is not pending'}), 400
    
    connection.status = 'accepted'
    connection.accepted_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({'message': 'Connection accepted successfully'}), 200

@social_bp.route('/connections/my', methods=['GET'])
@login_required
def get_my_connections():
    """Retorna as conexões do usuário atual"""
    connections = FamilyConnection.query.filter(
        ((FamilyConnection.user1_id == current_user.id) | (FamilyConnection.user2_id == current_user.id)) &
        (FamilyConnection.status == 'accepted')
    ).all()
    
    result = []
    for conn in connections:
        other_user_id = conn.user2_id if conn.user1_id == current_user.id else conn.user1_id
        other_user = User.query.get(other_user_id)
        
        result.append({
            'id': conn.id,
            'user': {
                'id': other_user.id,
                'name': other_user.name
            },
            'relationship_type': conn.relationship_type,
            'connected_since': conn.accepted_at.isoformat() if conn.accepted_at else None
        })
    
    return jsonify({'connections': result}), 200

@social_bp.route('/connections/pending', methods=['GET'])
@login_required
def get_pending_connections():
    """Retorna solicitações de conexão pendentes"""
    # Solicitações recebidas
    received = FamilyConnection.query.filter(
        (FamilyConnection.user2_id == current_user.id) &
        (FamilyConnection.status == 'pending')
    ).all()
    
    # Solicitações enviadas
    sent = FamilyConnection.query.filter(
        (FamilyConnection.user1_id == current_user.id) &
        (FamilyConnection.status == 'pending')
    ).all()
    
    result = {
        'received': [],
        'sent': []
    }
    
    for conn in received:
        requester = User.query.get(conn.user1_id)
        result['received'].append({
            'id': conn.id,
            'user': {
                'id': requester.id,
                'name': requester.name
            },
            'relationship_type': conn.relationship_type,
            'requested_at': conn.created_at.isoformat()
        })
    
    for conn in sent:
        target = User.query.get(conn.user2_id)
        result['sent'].append({
            'id': conn.id,
            'user': {
                'id': target.id,
                'name': target.name
            },
            'relationship_type': conn.relationship_type,
            'requested_at': conn.created_at.isoformat()
        })
    
    return jsonify(result), 200

# Post routes
@social_bp.route('/posts', methods=['POST'])
@login_required
def create_post():
    """Cria uma nova postagem"""
    data = request.get_json()
    
    post = Post(
        user_id=current_user.id,
        content=data.get('content'),
        post_type=data.get('post_type', 'text'),
        visibility=data.get('visibility', 'family')
    )
    
    db.session.add(post)
    db.session.commit()
    
    return jsonify({'message': 'Post created successfully', 'post': post.to_dict()}), 201

@social_bp.route('/posts', methods=['GET'])
@login_required
def get_posts():
    """Retorna postagens visíveis para o usuário"""
    # Por enquanto, retorna todas as postagens da família
    posts = Post.query.filter(
        Post.visibility.in_(['public', 'family'])
    ).order_by(Post.created_at.desc()).limit(50).all()
    
    result = [post.to_dict() for post in posts]
    return jsonify({'posts': result}), 200

@social_bp.route('/posts/<int:post_id>/like', methods=['POST'])
@login_required
def like_post(post_id):
    """Curte ou descurte uma postagem"""
    post = Post.query.get_or_404(post_id)
    
    # Verifica se já curtiu
    existing_like = PostLike.query.filter_by(post_id=post_id, user_id=current_user.id).first()
    
    if existing_like:
        # Remove curtida
        db.session.delete(existing_like)
        post.likes_count = max(0, post.likes_count - 1)
        action = 'unliked'
    else:
        # Adiciona curtida
        like = PostLike(post_id=post_id, user_id=current_user.id)
        db.session.add(like)
        post.likes_count += 1
        action = 'liked'
    
    db.session.commit()
    
    return jsonify({'message': f'Post {action} successfully', 'likes_count': post.likes_count}), 200

@social_bp.route('/posts/<int:post_id>/comments', methods=['POST'])
@login_required
def add_comment(post_id):
    """Adiciona um comentário a uma postagem"""
    post = Post.query.get_or_404(post_id)
    data = request.get_json()
    
    comment = PostComment(
        post_id=post_id,
        user_id=current_user.id,
        content=data.get('content')
    )
    
    db.session.add(comment)
    post.comments_count += 1
    db.session.commit()
    
    return jsonify({'message': 'Comment added successfully', 'comment': comment.to_dict()}), 201

@social_bp.route('/posts/<int:post_id>/comments', methods=['GET'])
@login_required
def get_comments(post_id):
    """Retorna comentários de uma postagem"""
    post = Post.query.get_or_404(post_id)
    comments = PostComment.query.filter_by(post_id=post_id).order_by(PostComment.created_at.asc()).all()
    
    result = [comment.to_dict() for comment in comments]
    return jsonify({'comments': result}), 200

# Search routes
@social_bp.route('/search/users', methods=['GET'])
@login_required
def search_users():
    """Busca usuários por nome"""
    query = request.args.get('q', '').strip()
    
    if len(query) < 2:
        return jsonify({'users': []}), 200
    
    users = User.query.filter(
        User.name.ilike(f'%{query}%')
    ).limit(20).all()
    
    result = []
    for user in users:
        if user.id != current_user.id:  # Não incluir o próprio usuário
            result.append({
                'id': user.id,
                'name': user.name,
                'email': user.email
            })
    
    return jsonify({'users': result}), 200

