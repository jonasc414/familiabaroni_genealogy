// Main JavaScript for Família Baroni

let currentUser = null;
let familyTree = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadStatistics();
    checkAuthStatus();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Register form
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            showSection(target);
        });
    });
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = { email, id: data.user_id };
            updateAuthUI();
            bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
            showAlert('Login realizado com sucesso!', 'success');
            loadUserProfile();
        } else {
            showAlert(data.message || 'Erro no login', 'danger');
        }
    } catch (error) {
        showAlert('Erro de conexão', 'danger');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('registerName').value,
        email: document.getElementById('registerEmail').value,
        password: document.getElementById('registerPassword').value,
        birth_date: document.getElementById('registerBirthDate').value,
        father_name: document.getElementById('fatherName').value,
        mother_name: document.getElementById('motherName').value,
        grandfather_paternal_name: document.getElementById('grandfatherPaternal').value,
        grandmother_paternal_name: document.getElementById('grandmotherPaternal').value,
        grandfather_maternal_name: document.getElementById('grandfatherMaternal').value,
        grandmother_maternal_name: document.getElementById('grandmotherMaternal').value
    };
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
            showAlert('Registro realizado com sucesso! Faça login para continuar.', 'success');
            document.getElementById('registerForm').reset();
        } else {
            showAlert(data.message || 'Erro no registro', 'danger');
        }
    } catch (error) {
        showAlert('Erro de conexão', 'danger');
    }
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        currentUser = null;
        updateAuthUI();
        showSection('home');
        showAlert('Logout realizado com sucesso!', 'success');
    } catch (error) {
        showAlert('Erro no logout', 'danger');
    }
}

// UI functions
function updateAuthUI() {
    const authNav = document.getElementById('authNav');
    const userNav = document.getElementById('userNav');
    
    if (currentUser) {
        authNav.classList.add('d-none');
        userNav.classList.remove('d-none');
        document.getElementById('userName').textContent = currentUser.email;
    } else {
        authNav.classList.remove('d-none');
        userNav.classList.add('d-none');
    }
}

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('section').forEach(section => {
        section.classList.add('d-none');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('d-none');
        
        // Load section-specific content
        switch(sectionId) {
            case 'tree':
                loadFamilyTree();
                break;
            case 'profile':
                if (currentUser) {
                    loadUserProfile();
                } else {
                    showLogin();
                    return;
                }
                break;
            case 'connections':
                if (currentUser) {
                    loadUserConnections();
                } else {
                    showLogin();
                    return;
                }
                break;
        }
    }
}

function showLogin() {
    new bootstrap.Modal(document.getElementById('loginModal')).show();
}

function showRegister() {
    new bootstrap.Modal(document.getElementById('registerModal')).show();
}

function showTree() {
    showSection('tree');
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Data loading functions
async function loadStatistics() {
    try {
        const response = await fetch('/api/statistics');
        if (response.ok) {
            const data = await response.json();
            document.getElementById('totalPersons').textContent = data.total_persons;
            document.getElementById('totalGenerations').textContent = data.generations;
            document.getElementById('totalUsers').textContent = data.total_users;
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

async function loadFamilyTree() {
    if (!currentUser) {
        showAlert('Faça login para ver a árvore genealógica', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/family-tree');
        if (response.ok) {
            const data = await response.json();
            familyTree = data.tree;
            renderFamilyTree();
        } else {
            showAlert('Erro ao carregar árvore genealógica', 'danger');
        }
    } catch (error) {
        showAlert('Erro de conexão', 'danger');
    }
}

function renderFamilyTree() {
    const container = document.getElementById('treeContainer');
    
    if (familyTree.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">Nenhuma pessoa encontrada na árvore genealógica.</p>';
        return;
    }
    
    // Group people by generation (simplified)
    const generations = {};
    familyTree.forEach(person => {
        const generation = getGeneration(person);
        if (!generations[generation]) {
            generations[generation] = [];
        }
        generations[generation].push(person);
    });
    
    let html = '';
    Object.keys(generations).sort((a, b) => a - b).forEach(gen => {
        html += `<div class="tree-level">`;
        generations[gen].forEach(person => {
            html += `
                <div class="person-node" onclick="showPersonDetails(${person.id})">
                    <h6>${person.name}</h6>
                    <small>${person.birth_date || 'Data desconhecida'}</small>
                    ${person.birth_place ? `<br><small>${person.birth_place}</small>` : ''}
                </div>
            `;
        });
        html += `</div>`;
    });
    
    container.innerHTML = html;
}

function getGeneration(person) {
    // Simplified generation calculation
    if (!person.father_id && !person.mother_id) {
        return 0; // Root generation
    }
    // For now, return a simple calculation
    return 1;
}

function showPersonDetails(personId) {
    const person = familyTree.find(p => p.id === personId);
    if (person) {
        alert(`Nome: ${person.name}\nNascimento: ${person.birth_date || 'Desconhecido'}\nLocal: ${person.birth_place || 'Desconhecido'}\nNotas: ${person.notes || 'Nenhuma'}`);
    }
}

async function loadUserProfile() {
    if (!currentUser) return;
    
    try {
        const response = await fetch('/api/profile');
        if (response.ok) {
            const data = await response.json();
            renderUserProfile(data);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function renderUserProfile(profile) {
    const content = document.getElementById('profileContent');
    content.innerHTML = `
        <div class="row">
            <div class="col-md-4 text-center">
                <div class="profile-avatar">
                    <i class="fas fa-user-circle fa-5x text-primary"></i>
                </div>
                <h4 class="mt-3">${profile.name}</h4>
                <p class="text-muted">${profile.email}</p>
            </div>
            <div class="col-md-8">
                <h5>Informações Pessoais</h5>
                <table class="table">
                    <tr>
                        <td><strong>Nome:</strong></td>
                        <td>${profile.name}</td>
                    </tr>
                    <tr>
                        <td><strong>E-mail:</strong></td>
                        <td>${profile.email}</td>
                    </tr>
                    <tr>
                        <td><strong>Data de Nascimento:</strong></td>
                        <td>${profile.birth_date}</td>
                    </tr>
                </table>
                
                <div class="mt-4">
                    <button class="btn btn-primary me-2">
                        <i class="fas fa-edit me-1"></i>Editar Perfil
                    </button>
                    <button class="btn btn-outline-primary" onclick="showSection('connections')">
                        <i class="fas fa-link me-1"></i>Ver Conexões
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function loadUserConnections() {
    if (!currentUser) return;
    
    try {
        const response = await fetch('/api/my-connections');
        if (response.ok) {
            const data = await response.json();
            renderUserConnections(data.connections);
        }
    } catch (error) {
        console.error('Error loading connections:', error);
    }
}

function renderUserConnections(connections) {
    const content = document.getElementById('profileContent');
    
    if (connections.length === 0) {
        content.innerHTML = `
            <div class="text-center">
                <i class="fas fa-link fa-3x text-muted mb-3"></i>
                <h5>Nenhuma conexão encontrada</h5>
                <p class="text-muted">Conecte-se com pessoas na árvore genealógica para ver suas conexões aqui.</p>
                <button class="btn btn-primary" onclick="showSection('tree')">
                    <i class="fas fa-tree me-1"></i>Ver Árvore Genealógica
                </button>
            </div>
        `;
        return;
    }
    
    let html = '<h5>Minhas Conexões</h5><div class="row">';
    connections.forEach(conn => {
        html += `
            <div class="col-md-6 mb-3">
                <div class="card">
                    <div class="card-body">
                        <h6>${conn.person.name}</h6>
                        <p class="text-muted mb-1">Relacionamento: ${conn.relationship_type}</p>
                        <small class="text-muted">${conn.person.birth_date || 'Data desconhecida'}</small>
                        ${conn.verified ? '<span class="badge bg-success ms-2">Verificado</span>' : '<span class="badge bg-warning ms-2">Pendente</span>'}
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    content.innerHTML = html;
}

async function checkAuthStatus() {
    try {
        const response = await fetch('/api/profile');
        if (response.ok) {
            const data = await response.json();
            currentUser = { email: data.email, id: data.id };
            updateAuthUI();
        }
    } catch (error) {
        // User not logged in
        currentUser = null;
        updateAuthUI();
    }
}


// Social Network Functions

// Setup social event listeners
function setupSocialEventListeners() {
    // Post form
    const postForm = document.getElementById('postForm');
    if (postForm) {
        postForm.addEventListener('submit', handleCreatePost);
    }
    
    // Search users
    const searchInput = document.getElementById('searchUsers');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearchUsers, 300));
    }
}

// Call setup when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupSocialEventListeners();
});

// Post functions
async function handleCreatePost(e) {
    e.preventDefault();
    
    const content = document.getElementById('postContent').value.trim();
    const visibility = document.getElementById('postVisibility').value;
    
    if (!content) {
        showAlert('Por favor, escreva algo para compartilhar', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content, visibility })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('postContent').value = '';
            showAlert('Post compartilhado com sucesso!', 'success');
            loadPosts(); // Reload posts
        } else {
            showAlert(data.message || 'Erro ao criar post', 'danger');
        }
    } catch (error) {
        showAlert('Erro de conexão', 'danger');
    }
}

async function loadPosts() {
    if (!currentUser) return;
    
    try {
        const response = await fetch('/api/posts');
        if (response.ok) {
            const data = await response.json();
            renderPosts(data.posts);
        }
    } catch (error) {
        console.error('Error loading posts:', error);
    }
}

function renderPosts(posts) {
    const container = document.getElementById('postsContainer');
    
    if (posts.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-comments fa-3x mb-3"></i>
                <h5>Nenhum post ainda</h5>
                <p>Seja o primeiro a compartilhar algo com a família!</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    posts.forEach(post => {
        html += `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <i class="fas fa-user-circle fa-2x text-primary me-3"></i>
                        <div>
                            <h6 class="mb-0">${post.user_name}</h6>
                            <small class="text-muted">${formatDate(post.created_at)}</small>
                        </div>
                        <div class="ms-auto">
                            <span class="badge bg-secondary">${post.visibility}</span>
                        </div>
                    </div>
                    <p class="card-text">${post.content}</p>
                    <div class="d-flex align-items-center justify-content-between">
                        <div>
                            <button class="btn btn-sm btn-outline-primary me-2" onclick="likePost(${post.id})">
                                <i class="fas fa-heart me-1"></i>${post.likes_count}
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="toggleComments(${post.id})">
                                <i class="fas fa-comment me-1"></i>${post.comments_count}
                            </button>
                        </div>
                    </div>
                    <div id="comments-${post.id}" class="mt-3 d-none">
                        <div class="border-top pt-3">
                            <div id="commentsList-${post.id}"></div>
                            <div class="mt-2">
                                <div class="input-group">
                                    <input type="text" class="form-control" id="commentInput-${post.id}" placeholder="Escreva um comentário...">
                                    <button class="btn btn-outline-primary" onclick="addComment(${post.id})">
                                        <i class="fas fa-paper-plane"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function likePost(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}/like`, {
            method: 'POST'
        });
        
        if (response.ok) {
            loadPosts(); // Reload to update like count
        }
    } catch (error) {
        showAlert('Erro ao curtir post', 'danger');
    }
}

async function toggleComments(postId) {
    const commentsDiv = document.getElementById(`comments-${postId}`);
    
    if (commentsDiv.classList.contains('d-none')) {
        commentsDiv.classList.remove('d-none');
        await loadComments(postId);
    } else {
        commentsDiv.classList.add('d-none');
    }
}

async function loadComments(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}/comments`);
        if (response.ok) {
            const data = await response.json();
            renderComments(postId, data.comments);
        }
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

function renderComments(postId, comments) {
    const container = document.getElementById(`commentsList-${postId}`);
    
    if (comments.length === 0) {
        container.innerHTML = '<p class="text-muted small">Nenhum comentário ainda.</p>';
        return;
    }
    
    let html = '';
    comments.forEach(comment => {
        html += `
            <div class="d-flex mb-2">
                <i class="fas fa-user-circle text-primary me-2"></i>
                <div class="flex-grow-1">
                    <div class="bg-light rounded p-2">
                        <strong>${comment.user_name}</strong>
                        <p class="mb-0 small">${comment.content}</p>
                    </div>
                    <small class="text-muted">${formatDate(comment.created_at)}</small>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function addComment(postId) {
    const input = document.getElementById(`commentInput-${postId}`);
    const content = input.value.trim();
    
    if (!content) return;
    
    try {
        const response = await fetch(`/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content })
        });
        
        if (response.ok) {
            input.value = '';
            await loadComments(postId);
            loadPosts(); // Reload to update comment count
        }
    } catch (error) {
        showAlert('Erro ao adicionar comentário', 'danger');
    }
}

// Connection functions
async function searchUsers() {
    const query = document.getElementById('searchUsers').value.trim();
    
    if (query.length < 2) {
        document.getElementById('searchResults').innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(`/api/search/users?q=${encodeURIComponent(query)}`);
        if (response.ok) {
            const data = await response.json();
            renderSearchResults(data.users);
        }
    } catch (error) {
        console.error('Error searching users:', error);
    }
}

function renderSearchResults(users) {
    const container = document.getElementById('searchResults');
    
    if (users.length === 0) {
        container.innerHTML = '<p class="text-muted small">Nenhum usuário encontrado.</p>';
        return;
    }
    
    let html = '';
    users.forEach(user => {
        html += `
            <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
                <div>
                    <strong>${user.name}</strong>
                    <br><small class="text-muted">${user.email}</small>
                </div>
                <button class="btn btn-sm btn-primary" onclick="requestConnection(${user.id})">
                    <i class="fas fa-user-plus me-1"></i>Conectar
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function requestConnection(userId) {
    const relationshipType = prompt('Qual o parentesco? (ex: primo, tio, sobrinho)') || 'family';
    
    try {
        const response = await fetch('/api/connections/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                user_id: userId,
                relationship_type: relationshipType
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Solicitação de conexão enviada!', 'success');
            loadPendingConnections();
        } else {
            showAlert(data.message || 'Erro ao enviar solicitação', 'danger');
        }
    } catch (error) {
        showAlert('Erro de conexão', 'danger');
    }
}

async function loadPendingConnections() {
    if (!currentUser) return;
    
    try {
        const response = await fetch('/api/connections/pending');
        if (response.ok) {
            const data = await response.json();
            renderPendingConnections(data);
        }
    } catch (error) {
        console.error('Error loading pending connections:', error);
    }
}

function renderPendingConnections(data) {
    const container = document.getElementById('pendingConnections');
    
    if (data.received.length === 0 && data.sent.length === 0) {
        container.innerHTML = '<p class="text-muted">Nenhuma solicitação pendente.</p>';
        return;
    }
    
    let html = '';
    
    if (data.received.length > 0) {
        html += '<h6>Solicitações Recebidas</h6>';
        data.received.forEach(conn => {
            html += `
                <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
                    <div>
                        <strong>${conn.user.name}</strong> quer se conectar como <em>${conn.relationship_type}</em>
                        <br><small class="text-muted">${formatDate(conn.requested_at)}</small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-success me-1" onclick="acceptConnection(${conn.id})">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="rejectConnection(${conn.id})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        });
    }
    
    if (data.sent.length > 0) {
        html += '<h6 class="mt-3">Solicitações Enviadas</h6>';
        data.sent.forEach(conn => {
            html += `
                <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
                    <div>
                        Solicitação para <strong>${conn.user.name}</strong> como <em>${conn.relationship_type}</em>
                        <br><small class="text-muted">${formatDate(conn.requested_at)}</small>
                    </div>
                    <span class="badge bg-warning">Pendente</span>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
}

async function acceptConnection(connectionId) {
    try {
        const response = await fetch(`/api/connections/accept/${connectionId}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            showAlert('Conexão aceita!', 'success');
            loadPendingConnections();
            loadMyConnections();
        }
    } catch (error) {
        showAlert('Erro ao aceitar conexão', 'danger');
    }
}

async function loadMyConnections() {
    if (!currentUser) return;
    
    try {
        const response = await fetch('/api/connections/my');
        if (response.ok) {
            const data = await response.json();
            renderMyConnections(data.connections);
        }
    } catch (error) {
        console.error('Error loading connections:', error);
    }
}

function renderMyConnections(connections) {
    const container = document.getElementById('myConnections');
    
    if (connections.length === 0) {
        container.innerHTML = '<p class="text-muted">Você ainda não tem conexões com outros parentes.</p>';
        return;
    }
    
    let html = '';
    connections.forEach(conn => {
        html += `
            <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
                <div>
                    <strong>${conn.user.name}</strong>
                    <br><small class="text-muted">${conn.relationship_type} • Conectado desde ${formatDate(conn.connected_since)}</small>
                </div>
                <button class="btn btn-sm btn-outline-primary" onclick="viewProfile(${conn.user.id})">
                    <i class="fas fa-eye me-1"></i>Ver Perfil
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function viewProfile(userId) {
    // For now, just show an alert. In a full implementation, this would open a profile modal
    showAlert('Funcionalidade de visualização de perfil em desenvolvimento', 'info');
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function handleSearchUsers() {
    searchUsers();
}

// Update showSection function to handle social sections
const originalShowSection = showSection;
showSection = function(sectionId) {
    originalShowSection(sectionId);
    
    // Load section-specific content for social features
    switch(sectionId) {
        case 'social':
            if (currentUser) {
                loadPosts();
            } else {
                showLogin();
                return;
            }
            break;
        case 'connections':
            if (currentUser) {
                loadPendingConnections();
                loadMyConnections();
            } else {
                showLogin();
                return;
            }
            break;
    }
};


// Media Upload Functions

// Setup media event listeners
function setupMediaEventListeners() {
    // Upload form
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleFileUpload);
    }
    
    // Album form
    const albumForm = document.getElementById('albumForm');
    if (albumForm) {
        albumForm.addEventListener('submit', handleCreateAlbum);
    }
}

// Call setup when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupMediaEventListeners();
});

// File upload functions
async function handleFileUpload(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showAlert('Por favor, selecione um arquivo', 'warning');
        return;
    }
    
    // Check file size (16MB limit)
    if (file.size > 16 * 1024 * 1024) {
        showAlert('Arquivo muito grande. Limite de 16MB', 'danger');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', document.getElementById('fileTitle').value);
    formData.append('description', document.getElementById('fileDescription').value);
    formData.append('tags', document.getElementById('fileTags').value);
    formData.append('person_id', document.getElementById('filePersonId').value);
    formData.append('is_public', document.getElementById('fileIsPublic').checked);
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Arquivo enviado com sucesso!', 'success');
            document.getElementById('uploadForm').reset();
            loadFiles(); // Reload files
        } else {
            showAlert(data.message || 'Erro no upload', 'danger');
        }
    } catch (error) {
        showAlert('Erro de conexão', 'danger');
    }
}

async function loadFiles() {
    if (!currentUser) return;
    
    const fileType = document.getElementById('fileTypeFilter').value;
    const personId = document.getElementById('personFilter').value;
    
    let url = '/api/files?';
    if (fileType !== 'all') {
        url += `type=${fileType}&`;
    }
    if (personId) {
        url += `person_id=${personId}&`;
    }
    
    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            renderFiles(data.files);
        }
    } catch (error) {
        console.error('Error loading files:', error);
    }
}

function renderFiles(files) {
    const container = document.getElementById('filesContainer');
    
    if (files.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center text-muted">
                <i class="fas fa-images fa-3x mb-3"></i>
                <h5>Nenhum arquivo encontrado</h5>
                <p>Faça upload de fotos e documentos para compartilhar com a família!</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    files.forEach(file => {
        const isImage = file.file_type === 'image';
        const fileUrl = `/api/serve/${file.filename}`;
        
        html += `
            <div class="col-md-4 col-lg-3 mb-4">
                <div class="card h-100">
                    <div class="card-img-top d-flex align-items-center justify-content-center" style="height: 200px; background-color: #f8f9fa;">
                        ${isImage ? 
                            `<img src="${fileUrl}" alt="${file.title || file.original_filename}" class="img-fluid" style="max-height: 100%; max-width: 100%; object-fit: cover;">` :
                            `<i class="fas fa-file-alt fa-3x text-muted"></i>`
                        }
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">${file.title || file.original_filename}</h6>
                        <p class="card-text small text-muted">${file.description || 'Sem descrição'}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">${file.user_name}</small>
                            <div class="btn-group" role="group">
                                <button class="btn btn-sm btn-outline-primary" onclick="viewFile(${file.id})">
                                    <i class="fas fa-eye"></i>
                                </button>
                                ${file.user_id === currentUser.id ? 
                                    `<button class="btn btn-sm btn-outline-danger" onclick="deleteFile(${file.id})">
                                        <i class="fas fa-trash"></i>
                                    </button>` : ''
                                }
                            </div>
                        </div>
                        ${file.tags && file.tags.length > 0 ? 
                            `<div class="mt-2">
                                ${file.tags.map(tag => `<span class="badge bg-secondary me-1">${tag.trim()}</span>`).join('')}
                            </div>` : ''
                        }
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function viewFile(fileId) {
    try {
        const response = await fetch(`/api/files/${fileId}`);
        if (response.ok) {
            const data = await response.json();
            const file = data.file;
            
            // Create modal to show file details
            const modalHtml = `
                <div class="modal fade" id="fileModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">${file.title || file.original_filename}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                ${file.file_type === 'image' ? 
                                    `<img src="/api/serve/${file.filename}" class="img-fluid mb-3" alt="${file.title}">` :
                                    `<div class="text-center mb-3">
                                        <i class="fas fa-file-alt fa-5x text-muted"></i>
                                        <p class="mt-2">Arquivo: ${file.original_filename}</p>
                                    </div>`
                                }
                                <p><strong>Descrição:</strong> ${file.description || 'Sem descrição'}</p>
                                <p><strong>Enviado por:</strong> ${file.user_name}</p>
                                <p><strong>Data:</strong> ${formatDate(file.created_at)}</p>
                                ${file.person_name ? `<p><strong>Pessoa associada:</strong> ${file.person_name}</p>` : ''}
                                ${file.tags && file.tags.length > 0 ? 
                                    `<p><strong>Tags:</strong> ${file.tags.map(tag => `<span class="badge bg-secondary me-1">${tag.trim()}</span>`).join('')}</p>` : ''
                                }
                            </div>
                            <div class="modal-footer">
                                <a href="/api/serve/${file.filename}" class="btn btn-primary" download="${file.original_filename}">
                                    <i class="fas fa-download me-1"></i>Baixar
                                </a>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            const existingModal = document.getElementById('fileModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // Add modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Show modal
            new bootstrap.Modal(document.getElementById('fileModal')).show();
        }
    } catch (error) {
        showAlert('Erro ao carregar arquivo', 'danger');
    }
}

async function deleteFile(fileId) {
    if (!confirm('Tem certeza que deseja excluir este arquivo?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/files/${fileId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('Arquivo excluído com sucesso!', 'success');
            loadFiles(); // Reload files
        } else {
            showAlert('Erro ao excluir arquivo', 'danger');
        }
    } catch (error) {
        showAlert('Erro de conexão', 'danger');
    }
}

// Album functions
async function handleCreateAlbum(e) {
    e.preventDefault();
    
    const name = document.getElementById('albumName').value.trim();
    const description = document.getElementById('albumDescription').value.trim();
    const isPublic = document.getElementById('albumIsPublic').checked;
    
    if (!name) {
        showAlert('Por favor, digite um nome para o álbum', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/albums', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, description, is_public: isPublic })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Álbum criado com sucesso!', 'success');
            document.getElementById('albumForm').reset();
            loadAlbums(); // Reload albums
        } else {
            showAlert(data.message || 'Erro ao criar álbum', 'danger');
        }
    } catch (error) {
        showAlert('Erro de conexão', 'danger');
    }
}

async function loadAlbums() {
    if (!currentUser) return;
    
    try {
        const response = await fetch('/api/albums');
        if (response.ok) {
            const data = await response.json();
            renderAlbums(data.albums);
        }
    } catch (error) {
        console.error('Error loading albums:', error);
    }
}

function renderAlbums(albums) {
    const container = document.getElementById('albumsContainer');
    
    if (albums.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center text-muted">
                <i class="fas fa-photo-video fa-3x mb-3"></i>
                <h5>Nenhum álbum encontrado</h5>
                <p>Crie álbuns para organizar suas fotos da família!</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    albums.forEach(album => {
        html += `
            <div class="col-md-4 col-lg-3 mb-4">
                <div class="card h-100">
                    <div class="card-img-top d-flex align-items-center justify-content-center" style="height: 200px; background-color: #f8f9fa;">
                        <i class="fas fa-images fa-3x text-muted"></i>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">${album.name}</h6>
                        <p class="card-text small text-muted">${album.description || 'Sem descrição'}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">${album.photo_count} fotos</small>
                            <button class="btn btn-sm btn-outline-primary" onclick="viewAlbum(${album.id})">
                                <i class="fas fa-eye me-1"></i>Ver
                            </button>
                        </div>
                        <div class="mt-2">
                            <small class="text-muted">Por ${album.user_name}</small>
                            ${album.is_public ? '<span class="badge bg-success ms-2">Público</span>' : '<span class="badge bg-warning ms-2">Privado</span>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function viewAlbum(albumId) {
    try {
        const response = await fetch(`/api/albums/${albumId}/photos`);
        if (response.ok) {
            const data = await response.json();
            showAlbumModal(data.album, data.photos);
        }
    } catch (error) {
        showAlert('Erro ao carregar álbum', 'danger');
    }
}

function showAlbumModal(album, photos) {
    const modalHtml = `
        <div class="modal fade" id="albumModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${album.name}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="text-muted">${album.description || 'Sem descrição'}</p>
                        <div class="row">
                            ${photos.map(photo => `
                                <div class="col-md-3 mb-3">
                                    <img src="/api/serve/${photo.filename}" class="img-fluid rounded" alt="${photo.title}" style="cursor: pointer;" onclick="showImageModal('/api/serve/${photo.filename}', '${photo.title}')">
                                </div>
                            `).join('')}
                        </div>
                        ${photos.length === 0 ? '<p class="text-center text-muted">Este álbum ainda não tem fotos.</p>' : ''}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('albumModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    new bootstrap.Modal(document.getElementById('albumModal')).show();
}

function showImageModal(imageUrl, title) {
    const modalHtml = `
        <div class="modal fade" id="imageModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <img src="${imageUrl}" class="img-fluid" alt="${title}">
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('imageModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    new bootstrap.Modal(document.getElementById('imageModal')).show();
}

// Load person options for dropdowns
async function loadPersonOptions() {
    try {
        const response = await fetch('/api/family-tree');
        if (response.ok) {
            const data = await response.json();
            const persons = data.tree;
            
            const selects = ['filePersonId', 'personFilter'];
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                if (select) {
                    // Clear existing options (except first one)
                    while (select.children.length > 1) {
                        select.removeChild(select.lastChild);
                    }
                    
                    // Add person options
                    persons.forEach(person => {
                        const option = document.createElement('option');
                        option.value = person.id;
                        option.textContent = person.name;
                        select.appendChild(option);
                    });
                }
            });
        }
    } catch (error) {
        console.error('Error loading person options:', error);
    }
}

// Update showSection function to handle media sections
const originalShowSection2 = showSection;
showSection = function(sectionId) {
    originalShowSection2(sectionId);
    
    // Load section-specific content for media features
    switch(sectionId) {
        case 'gallery':
            if (currentUser) {
                loadFiles();
                loadPersonOptions();
            } else {
                showLogin();
                return;
            }
            break;
        case 'albums':
            if (currentUser) {
                loadAlbums();
            } else {
                showLogin();
                return;
            }
            break;
    }
};


// Forum and Guestbook Functions

// Setup forum event listeners
function setupForumEventListeners() {
    // Create topic form
    const createTopicForm = document.getElementById('createTopicForm');
    if (createTopicForm) {
        createTopicForm.addEventListener('submit', handleCreateTopic);
    }
    
    // Guestbook form
    const guestbookForm = document.getElementById('guestbookForm');
    if (guestbookForm) {
        guestbookForm.addEventListener('submit', handleGuestbookEntry);
    }
    
    // Forum search
    const forumSearch = document.getElementById('forumSearch');
    if (forumSearch) {
        forumSearch.addEventListener('input', debounce(searchForum, 300));
    }
}

// Call setup when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupForumEventListeners();
});

// Forum functions
async function loadForumCategories() {
    try {
        const response = await fetch('/api/forum/categories');
        if (response.ok) {
            const data = await response.json();
            renderForumCategories(data.categories);
            populateTopicCategorySelect(data.categories);
        }
    } catch (error) {
        console.error('Error loading forum categories:', error);
    }
}

function renderForumCategories(categories) {
    const container = document.getElementById('forumCategories');
    
    if (categories.length === 0) {
        container.innerHTML = '<p class="text-muted">Nenhuma categoria encontrada.</p>';
        return;
    }
    
    // Group categories by type
    const grouped = {};
    categories.forEach(cat => {
        if (!grouped[cat.category_type]) {
            grouped[cat.category_type] = [];
        }
        grouped[cat.category_type].push(cat);
    });
    
    const typeNames = {
        'location': 'Por Localização',
        'surname': 'Por Sobrenome',
        'ancestry': 'Por Descendência',
        'general': 'Geral'
    };
    
    let html = '';
    Object.keys(grouped).forEach(type => {
        html += `<h6 class="text-primary mt-3 mb-2">${typeNames[type] || type}</h6>`;
        grouped[type].forEach(category => {
            html += `
                <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
                    <div class="d-flex align-items-center">
                        <i class="${category.icon} me-3" style="color: ${category.color}; width: 20px;"></i>
                        <div>
                            <strong>${category.name}</strong>
                            <br><small class="text-muted">${category.description}</small>
                        </div>
                    </div>
                    <div class="text-end">
                        <small class="text-muted">${category.topic_count} tópicos</small>
                        <br><small class="text-muted">${category.post_count} posts</small>
                    </div>
                </div>
            `;
        });
    });
    
    container.innerHTML = html;
}

function populateTopicCategorySelect(categories) {
    const select = document.getElementById('topicCategory');
    if (!select) return;
    
    // Clear existing options (except first one)
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
    });
}

async function loadRecentTopics() {
    try {
        const response = await fetch('/api/forum/topics');
        if (response.ok) {
            const data = await response.json();
            renderRecentTopics(data.topics.slice(0, 10)); // Show only 10 most recent
        }
    } catch (error) {
        console.error('Error loading recent topics:', error);
    }
}

function renderRecentTopics(topics) {
    const container = document.getElementById('recentTopics');
    
    if (topics.length === 0) {
        container.innerHTML = '<p class="text-muted">Nenhum tópico encontrado.</p>';
        return;
    }
    
    let html = '';
    topics.forEach(topic => {
        html += `
            <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
                <div class="flex-grow-1" style="cursor: pointer;" onclick="viewTopic(${topic.id})">
                    <div class="d-flex align-items-center">
                        ${topic.is_pinned ? '<i class="fas fa-thumbtack text-warning me-2"></i>' : ''}
                        ${topic.is_locked ? '<i class="fas fa-lock text-muted me-2"></i>' : ''}
                        <strong>${topic.title}</strong>
                    </div>
                    <small class="text-muted">Por ${topic.user_name} • ${formatDate(topic.created_at)}</small>
                </div>
                <div class="text-end">
                    <small class="text-muted">${topic.posts_count} respostas</small>
                    <br><small class="text-muted">${topic.views_count} visualizações</small>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function showCreateTopicModal() {
    if (!currentUser) {
        showLogin();
        return;
    }
    
    new bootstrap.Modal(document.getElementById('createTopicModal')).show();
}

async function handleCreateTopic(e) {
    e.preventDefault();
    
    const categoryId = document.getElementById('topicCategory').value;
    const title = document.getElementById('topicTitle').value.trim();
    const content = document.getElementById('topicContent').value.trim();
    
    if (!categoryId || !title || !content) {
        showAlert('Por favor, preencha todos os campos', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/forum/topics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ category_id: categoryId, title, content })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('createTopicModal')).hide();
            document.getElementById('createTopicForm').reset();
            showAlert('Tópico criado com sucesso!', 'success');
            loadRecentTopics();
            viewTopic(data.topic.id);
        } else {
            showAlert(data.message || 'Erro ao criar tópico', 'danger');
        }
    } catch (error) {
        showAlert('Erro de conexão', 'danger');
    }
}

async function viewTopic(topicId) {
    try {
        const response = await fetch(`/api/forum/topics/${topicId}`);
        if (response.ok) {
            const data = await response.json();
            renderTopicView(data.topic, data.posts);
            showSection('topic');
        }
    } catch (error) {
        showAlert('Erro ao carregar tópico', 'danger');
    }
}

function renderTopicView(topic, posts) {
    const topicContent = document.getElementById('topicContent');
    const topicInfo = document.getElementById('topicInfo');
    
    // Render topic content
    let topicHtml = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <div>
                    <h4 class="mb-0">${topic.title}</h4>
                    <small class="text-muted">Por ${topic.user_name} • ${formatDate(topic.created_at)}</small>
                </div>
                <button class="btn btn-outline-secondary btn-sm" onclick="showSection('forum')">
                    <i class="fas fa-arrow-left me-1"></i>Voltar
                </button>
            </div>
            <div class="card-body">
                <p>${topic.content}</p>
            </div>
        </div>
    `;
    
    // Render posts
    if (posts.length > 0) {
        topicHtml += '<div class="mt-4">';
        posts.forEach(post => {
            topicHtml += `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <strong>${post.user_name}</strong>
                            <small class="text-muted">
                                ${formatDate(post.created_at)}
                                ${post.is_edited ? ' (editado)' : ''}
                            </small>
                        </div>
                        <p class="mb-0">${post.content}</p>
                    </div>
                </div>
            `;
        });
        topicHtml += '</div>';
    }
    
    // Add reply form if user is logged in and topic is not locked
    if (currentUser && !topic.is_locked) {
        topicHtml += `
            <div class="card mt-4">
                <div class="card-header">
                    <h6 class="mb-0">Responder</h6>
                </div>
                <div class="card-body">
                    <form onsubmit="handleReplyToTopic(event, ${topic.id})">
                        <div class="mb-3">
                            <textarea class="form-control" id="replyContent" rows="4" placeholder="Escreva sua resposta..." required></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-reply me-1"></i>Responder
                        </button>
                    </form>
                </div>
            </div>
        `;
    }
    
    topicContent.innerHTML = topicHtml;
    
    // Render topic info
    topicInfo.innerHTML = `
        <p><strong>Visualizações:</strong> ${topic.views_count}</p>
        <p><strong>Respostas:</strong> ${topic.posts_count}</p>
        <p><strong>Criado em:</strong> ${formatDate(topic.created_at)}</p>
        ${topic.last_post_at ? `<p><strong>Última resposta:</strong> ${formatDate(topic.last_post_at)}</p>` : ''}
        ${topic.is_pinned ? '<span class="badge bg-warning">Fixado</span>' : ''}
        ${topic.is_locked ? '<span class="badge bg-secondary">Bloqueado</span>' : ''}
    `;
}

async function handleReplyToTopic(e, topicId) {
    e.preventDefault();
    
    const content = document.getElementById('replyContent').value.trim();
    
    if (!content) {
        showAlert('Por favor, escreva uma resposta', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/forum/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ topic_id: topicId, content })
        });
        
        if (response.ok) {
            showAlert('Resposta adicionada com sucesso!', 'success');
            viewTopic(topicId); // Reload topic
        } else {
            const data = await response.json();
            showAlert(data.message || 'Erro ao adicionar resposta', 'danger');
        }
    } catch (error) {
        showAlert('Erro de conexão', 'danger');
    }
}

async function searchForum() {
    const query = document.getElementById('forumSearch').value.trim();
    
    if (query.length < 3) {
        document.getElementById('forumSearchResults').innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(`/api/forum/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
            const data = await response.json();
            renderForumSearchResults(data);
        }
    } catch (error) {
        console.error('Error searching forum:', error);
    }
}

function renderForumSearchResults(data) {
    const container = document.getElementById('forumSearchResults');
    
    if (data.topics.length === 0 && data.posts.length === 0) {
        container.innerHTML = '<p class="text-muted small">Nenhum resultado encontrado.</p>';
        return;
    }
    
    let html = '';
    
    if (data.topics.length > 0) {
        html += '<h6>Tópicos</h6>';
        data.topics.forEach(topic => {
            html += `
                <div class="border-bottom py-2" style="cursor: pointer;" onclick="viewTopic(${topic.id})">
                    <strong>${topic.title}</strong>
                    <br><small class="text-muted">Por ${topic.user_name}</small>
                </div>
            `;
        });
    }
    
    if (data.posts.length > 0) {
        html += '<h6 class="mt-3">Posts</h6>';
        data.posts.forEach(post => {
            html += `
                <div class="border-bottom py-2" style="cursor: pointer;" onclick="viewTopic(${post.topic_id})">
                    <small>${post.content.substring(0, 100)}...</small>
                    <br><small class="text-muted">Por ${post.user_name}</small>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
}

// Guestbook functions
async function loadGuestbookEntries() {
    try {
        const response = await fetch('/api/guestbook');
        if (response.ok) {
            const data = await response.json();
            renderGuestbookEntries(data.entries);
        }
    } catch (error) {
        console.error('Error loading guestbook entries:', error);
    }
}

function renderGuestbookEntries(entries) {
    const container = document.getElementById('guestbookEntries');
    
    if (entries.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-book fa-3x mb-3"></i>
                <h5>Livro de Visitas Vazio</h5>
                <p>Seja o primeiro a deixar uma mensagem!</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    entries.forEach(entry => {
        html += `
            <div class="card mb-4">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-user-circle fa-2x text-primary me-3"></i>
                            <div>
                                <strong>${entry.name}</strong>
                                ${entry.is_anonymous ? '<span class="badge bg-secondary ms-2">Visitante</span>' : '<span class="badge bg-primary ms-2">Família</span>'}
                                <br><small class="text-muted">${formatDate(entry.created_at)}</small>
                            </div>
                        </div>
                        ${entry.user_id === (currentUser ? currentUser.id : null) ? 
                            `<button class="btn btn-sm btn-outline-danger" onclick="deleteGuestbookEntry(${entry.id})">
                                <i class="fas fa-trash"></i>
                            </button>` : ''
                        }
                    </div>
                    <p class="mb-0">${entry.message}</p>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function handleGuestbookEntry(e) {
    e.preventDefault();
    
    const message = document.getElementById('guestMessage').value.trim();
    
    if (!message) {
        showAlert('Por favor, escreva uma mensagem', 'warning');
        return;
    }
    
    const data = { message };
    
    // If user is not logged in, get name and email
    if (!currentUser) {
        data.name = document.getElementById('guestName').value.trim();
        data.email = document.getElementById('guestEmail').value.trim();
        
        if (!data.name) {
            showAlert('Por favor, digite seu nome', 'warning');
            return;
        }
    }
    
    try {
        const response = await fetch('/api/guestbook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showAlert('Mensagem adicionada ao livro de visitas!', 'success');
            document.getElementById('guestbookForm').reset();
            loadGuestbookEntries();
        } else {
            const responseData = await response.json();
            showAlert(responseData.message || 'Erro ao adicionar mensagem', 'danger');
        }
    } catch (error) {
        showAlert('Erro de conexão', 'danger');
    }
}

async function deleteGuestbookEntry(entryId) {
    if (!confirm('Tem certeza que deseja excluir esta mensagem?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/guestbook/${entryId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('Mensagem excluída com sucesso!', 'success');
            loadGuestbookEntries();
        } else {
            showAlert('Erro ao excluir mensagem', 'danger');
        }
    } catch (error) {
        showAlert('Erro de conexão', 'danger');
    }
}

function updateGuestbookForm() {
    const anonymousFields = document.getElementById('anonymousFields');
    const userInfo = document.getElementById('userInfo');
    
    if (currentUser) {
        anonymousFields.style.display = 'none';
        userInfo.textContent = `Logado como ${currentUser.email}`;
    } else {
        anonymousFields.style.display = 'block';
        userInfo.textContent = 'Você está visitando como anônimo';
    }
}

// Update showSection function to handle forum and guestbook sections
const originalShowSection3 = showSection;
showSection = function(sectionId) {
    originalShowSection3(sectionId);
    
    // Load section-specific content for forum and guestbook
    switch(sectionId) {
        case 'forum':
            loadForumCategories();
            loadRecentTopics();
            break;
        case 'guestbook':
            loadGuestbookEntries();
            updateGuestbookForm();
            break;
    }
};

