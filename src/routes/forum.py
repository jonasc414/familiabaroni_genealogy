from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from src.models.forum import ForumCategory, ForumTopic, ForumPost, GuestbookEntry
from src.database import db
from datetime import datetime

forum_bp = Blueprint('forum_bp', __name__)

# Forum Category routes
@forum_bp.route('/forum/categories', methods=['GET'])
def get_categories():
    """Retorna todas as categorias do fórum"""
    categories = ForumCategory.query.filter_by(is_active=True).all()
    return jsonify({
        'categories': [cat.to_dict() for cat in categories]
    }), 200

@forum_bp.route('/forum/categories', methods=['POST'])
@login_required
def create_category():
    """Cria uma nova categoria (apenas para admins)"""
    data = request.get_json()
    
    category = ForumCategory(
        name=data.get('name'),
        description=data.get('description'),
        category_type=data.get('category_type'),
        icon=data.get('icon', 'fas fa-folder'),
        color=data.get('color', '#007bff')
    )
    
    db.session.add(category)
    db.session.commit()
    
    return jsonify({
        'message': 'Category created successfully',
        'category': category.to_dict()
    }), 201

# Forum Topic routes
@forum_bp.route('/forum/topics', methods=['GET'])
def get_topics():
    """Retorna tópicos do fórum"""
    category_id = request.args.get('category_id')
    
    query = ForumTopic.query
    if category_id:
        query = query.filter_by(category_id=category_id)
    
    topics = query.order_by(
        ForumTopic.is_pinned.desc(),
        ForumTopic.last_post_at.desc()
    ).all()
    
    return jsonify({
        'topics': [topic.to_dict() for topic in topics]
    }), 200

@forum_bp.route('/forum/topics', methods=['POST'])
@login_required
def create_topic():
    """Cria um novo tópico"""
    data = request.get_json()
    
    topic = ForumTopic(
        category_id=data.get('category_id'),
        user_id=current_user.id,
        title=data.get('title'),
        content=data.get('content')
    )
    
    db.session.add(topic)
    db.session.commit()
    
    return jsonify({
        'message': 'Topic created successfully',
        'topic': topic.to_dict()
    }), 201

@forum_bp.route('/forum/topics/<int:topic_id>', methods=['GET'])
def get_topic(topic_id):
    """Retorna um tópico específico com suas postagens"""
    topic = ForumTopic.query.get_or_404(topic_id)
    
    # Increment view count
    topic.views_count += 1
    db.session.commit()
    
    # Get posts
    posts = ForumPost.query.filter_by(topic_id=topic_id).order_by(ForumPost.created_at.asc()).all()
    
    return jsonify({
        'topic': topic.to_dict(),
        'posts': [post.to_dict() for post in posts]
    }), 200

# Forum Post routes
@forum_bp.route('/forum/posts', methods=['POST'])
@login_required
def create_post():
    """Cria uma nova postagem em um tópico"""
    data = request.get_json()
    topic_id = data.get('topic_id')
    
    # Verify topic exists and is not locked
    topic = ForumTopic.query.get_or_404(topic_id)
    if topic.is_locked:
        return jsonify({'message': 'Topic is locked'}), 403
    
    post = ForumPost(
        topic_id=topic_id,
        user_id=current_user.id,
        content=data.get('content')
    )
    
    db.session.add(post)
    
    # Update topic stats
    topic.posts_count += 1
    topic.last_post_at = datetime.utcnow()
    topic.last_post_user_id = current_user.id
    
    db.session.commit()
    
    return jsonify({
        'message': 'Post created successfully',
        'post': post.to_dict()
    }), 201

@forum_bp.route('/forum/posts/<int:post_id>', methods=['PUT'])
@login_required
def update_post(post_id):
    """Atualiza uma postagem"""
    post = ForumPost.query.get_or_404(post_id)
    
    # Check permissions
    if post.user_id != current_user.id:
        return jsonify({'message': 'Access denied'}), 403
    
    data = request.get_json()
    post.content = data.get('content', post.content)
    post.is_edited = True
    post.edited_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        'message': 'Post updated successfully',
        'post': post.to_dict()
    }), 200

@forum_bp.route('/forum/posts/<int:post_id>', methods=['DELETE'])
@login_required
def delete_post(post_id):
    """Deleta uma postagem"""
    post = ForumPost.query.get_or_404(post_id)
    
    # Check permissions
    if post.user_id != current_user.id:
        return jsonify({'message': 'Access denied'}), 403
    
    topic = post.topic
    
    db.session.delete(post)
    
    # Update topic stats
    topic.posts_count = max(0, topic.posts_count - 1)
    
    # Update last post info
    last_post = ForumPost.query.filter_by(topic_id=topic.id).order_by(ForumPost.created_at.desc()).first()
    if last_post:
        topic.last_post_at = last_post.created_at
        topic.last_post_user_id = last_post.user_id
    
    db.session.commit()
    
    return jsonify({'message': 'Post deleted successfully'}), 200

# Guestbook routes
@forum_bp.route('/guestbook', methods=['GET'])
def get_guestbook_entries():
    """Retorna entradas do livro de visitas"""
    entries = GuestbookEntry.query.filter_by(is_approved=True).order_by(GuestbookEntry.created_at.desc()).all()
    
    return jsonify({
        'entries': [entry.to_dict() for entry in entries]
    }), 200

@forum_bp.route('/guestbook', methods=['POST'])
def create_guestbook_entry():
    """Cria uma nova entrada no livro de visitas"""
    data = request.get_json()
    
    # Check if user is logged in
    if current_user.is_authenticated:
        entry = GuestbookEntry(
            user_id=current_user.id,
            name=current_user.name,
            message=data.get('message'),
            is_anonymous=False
        )
    else:
        # Anonymous entry
        entry = GuestbookEntry(
            name=data.get('name'),
            email=data.get('email'),
            message=data.get('message'),
            is_anonymous=True
        )
    
    db.session.add(entry)
    db.session.commit()
    
    return jsonify({
        'message': 'Guestbook entry created successfully',
        'entry': entry.to_dict()
    }), 201

@forum_bp.route('/guestbook/<int:entry_id>', methods=['DELETE'])
@login_required
def delete_guestbook_entry(entry_id):
    """Deleta uma entrada do livro de visitas"""
    entry = GuestbookEntry.query.get_or_404(entry_id)
    
    # Check permissions (only own entries or admin)
    if entry.user_id != current_user.id:
        return jsonify({'message': 'Access denied'}), 403
    
    db.session.delete(entry)
    db.session.commit()
    
    return jsonify({'message': 'Guestbook entry deleted successfully'}), 200

# Search routes
@forum_bp.route('/forum/search', methods=['GET'])
def search_forum():
    """Busca no fórum"""
    query = request.args.get('q', '').strip()
    
    if len(query) < 3:
        return jsonify({'topics': [], 'posts': []}), 200
    
    # Search topics
    topics = ForumTopic.query.filter(
        ForumTopic.title.ilike(f'%{query}%') |
        ForumTopic.content.ilike(f'%{query}%')
    ).limit(10).all()
    
    # Search posts
    posts = ForumPost.query.filter(
        ForumPost.content.ilike(f'%{query}%')
    ).limit(10).all()
    
    return jsonify({
        'topics': [topic.to_dict() for topic in topics],
        'posts': [post.to_dict() for post in posts]
    }), 200

