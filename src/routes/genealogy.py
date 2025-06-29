from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from src.models.person import Person
from src.models.family_tree import FamilyTree, UserPersonConnection
from src.database import db

genealogy_bp = Blueprint('genealogy_bp', __name__)

@genealogy_bp.route('/family-tree', methods=['GET'])
@login_required
def get_family_tree():
    """Retorna a árvore genealógica da família Baroni"""
    # Por enquanto, retorna todas as pessoas
    persons = Person.query.all()
    tree_data = []
    
    for person in persons:
        tree_data.append(person.to_dict())
    
    return jsonify({'tree': tree_data}), 200

@genealogy_bp.route('/person', methods=['POST'])
@login_required
def add_person():
    """Adiciona uma nova pessoa à árvore genealógica"""
    data = request.get_json()
    
    new_person = Person(
        name=data.get('name'),
        birth_date=data.get('birth_date'),
        birth_place=data.get('birth_place'),
        death_date=data.get('death_date'),
        death_place=data.get('death_place'),
        gender=data.get('gender'),
        notes=data.get('notes'),
        father_id=data.get('father_id'),
        mother_id=data.get('mother_id')
    )
    
    db.session.add(new_person)
    db.session.commit()
    
    return jsonify({'message': 'Person added successfully', 'person': new_person.to_dict()}), 201

@genealogy_bp.route('/person/<int:person_id>', methods=['GET'])
@login_required
def get_person(person_id):
    """Retorna informações de uma pessoa específica"""
    person = Person.query.get_or_404(person_id)
    return jsonify({'person': person.to_dict()}), 200

@genealogy_bp.route('/person/<int:person_id>', methods=['PUT'])
@login_required
def update_person(person_id):
    """Atualiza informações de uma pessoa"""
    person = Person.query.get_or_404(person_id)
    data = request.get_json()
    
    person.name = data.get('name', person.name)
    person.birth_date = data.get('birth_date', person.birth_date)
    person.birth_place = data.get('birth_place', person.birth_place)
    person.death_date = data.get('death_date', person.death_date)
    person.death_place = data.get('death_place', person.death_place)
    person.gender = data.get('gender', person.gender)
    person.notes = data.get('notes', person.notes)
    person.father_id = data.get('father_id', person.father_id)
    person.mother_id = data.get('mother_id', person.mother_id)
    
    db.session.commit()
    
    return jsonify({'message': 'Person updated successfully', 'person': person.to_dict()}), 200

@genealogy_bp.route('/connect-person', methods=['POST'])
@login_required
def connect_user_to_person():
    """Conecta o usuário atual a uma pessoa na árvore genealógica"""
    data = request.get_json()
    person_id = data.get('person_id')
    relationship_type = data.get('relationship_type', 'self')
    
    # Verifica se a pessoa existe
    person = Person.query.get_or_404(person_id)
    
    # Verifica se já existe uma conexão
    existing_connection = UserPersonConnection.query.filter_by(
        user_id=current_user.id,
        person_id=person_id
    ).first()
    
    if existing_connection:
        return jsonify({'message': 'Connection already exists'}), 409
    
    # Cria nova conexão
    connection = UserPersonConnection(
        user_id=current_user.id,
        person_id=person_id,
        relationship_type=relationship_type
    )
    
    db.session.add(connection)
    db.session.commit()
    
    return jsonify({'message': 'Connection created successfully'}), 201

@genealogy_bp.route('/my-connections', methods=['GET'])
@login_required
def get_my_connections():
    """Retorna as conexões do usuário atual com pessoas na árvore"""
    connections = UserPersonConnection.query.filter_by(user_id=current_user.id).all()
    
    result = []
    for conn in connections:
        result.append({
            'id': conn.id,
            'person': conn.person.to_dict(),
            'relationship_type': conn.relationship_type,
            'verified': conn.verified
        })
    
    return jsonify({'connections': result}), 200

@genealogy_bp.route('/statistics', methods=['GET'])
@login_required
def get_statistics():
    """Retorna estatísticas da família"""
    total_persons = Person.query.count()
    total_users = db.session.query(UserPersonConnection.user_id).distinct().count()
    
    # Calcular gerações (simplificado)
    max_generation = 0
    root_persons = Person.query.filter_by(father_id=None, mother_id=None).all()
    
    def calculate_generation(person, generation=0):
        nonlocal max_generation
        max_generation = max(max_generation, generation)
        
        # Buscar filhos
        children = Person.query.filter(
            (Person.father_id == person.id) | (Person.mother_id == person.id)
        ).all()
        
        for child in children:
            calculate_generation(child, generation + 1)
    
    for root in root_persons:
        calculate_generation(root)
    
    return jsonify({
        'total_persons': total_persons,
        'total_users': total_users,
        'generations': max_generation + 1
    }), 200

