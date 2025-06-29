from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from src.models.user import db, User

user_bp = Blueprint('user_bp', __name__)

@user_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    birth_date = data.get('birth_date')

    if not email or not password or not name or not birth_date:
        return jsonify({'message': 'Missing required fields'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'User already exists'}), 409

    new_user = User(
        email=email,
        password=password, # In a real application, hash the password
        name=name,
        birth_date=birth_date,
        father_name=data.get('father_name'),
        mother_name=data.get('mother_name'),
        grandfather_paternal_name=data.get('grandfather_paternal_name'),
        grandmother_paternal_name=data.get('grandmother_paternal_name'),
        grandfather_maternal_name=data.get('grandfather_maternal_name'),
        grandmother_maternal_name=data.get('grandmother_maternal_name'),
        great_grandfather_paternal_paternal_name=data.get('great_grandfather_paternal_paternal_name'),
        great_grandmother_paternal_paternal_name=data.get('great_grandmother_paternal_paternal_name'),
        great_grandfather_paternal_maternal_name=data.get('great_grandfather_paternal_maternal_name'),
        great_grandmother_paternal_maternal_name=data.get('great_grandmother_paternal_maternal_name'),
        great_grandfather_maternal_paternal_name=data.get('great_grandfather_maternal_paternal_name'),
        great_grandmother_maternal_paternal_name=data.get('great_grandmother_maternal_paternal_name'),
        great_grandfather_maternal_maternal_name=data.get('great_grandfather_maternal_maternal_name'),
        great_grandmother_maternal_maternal_name=data.get('great_grandmother_maternal_maternal_name')
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully'}), 201

@user_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()

    if not user or user.password != password: # In a real application, check hashed password
        return jsonify({'message': 'Invalid credentials'}), 401

    login_user(user)
    return jsonify({'message': 'Login successful', 'user_id': user.id}), 200

@user_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logout successful'}), 200

@user_bp.route('/profile', methods=['GET'])
@login_required
def profile():
    return jsonify({
        'id': current_user.id,
        'email': current_user.email,
        'name': current_user.name,
        'birth_date': current_user.birth_date
    }), 200


