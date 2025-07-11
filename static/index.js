// Armazena credenciais em memória e no localStorage
let credentials = {
    email: '',
    password: ''
};

// Elementos da UI
const loginForm = document.getElementById('loginForm');
const loginContainer = document.getElementById('loginContainer');
const mainContent = document.getElementById('mainContent');
const uploadForm = document.getElementById('uploadForm');
const filesList = document.getElementById('filesList');
const refreshBtn = document.getElementById('refreshBtn');
const toggleAutoRefresh = document.getElementById('toggleAutoRefresh');
const refreshStatus = document.getElementById('refreshStatus');
const logoutBtn = document.getElementById('logoutBtn');

// Variáveis de controle de atualização
let refreshInterval = null;
let isAutoRefreshEnabled = false;
let lastProcessedFileId = null;

// Funções para gerenciar o localStorage
function saveCredentials(email, password) {
    localStorage.setItem('videoProcessorCredentials', JSON.stringify({email, password}));
}

function loadCredentials() {
    const saved = localStorage.getItem('videoProcessorCredentials');
    if (saved) {
        const {email, password} = JSON.parse(saved);
        credentials = {email, password};
        return true;
    }
    return false;
}

function clearCredentials() {
    localStorage.removeItem('videoProcessorCredentials');
    credentials = {email: '', password: ''};
}

// Verifica login ao carregar a página
document.addEventListener('DOMContentLoaded', function () {
    if (loadCredentials()) {
        // Se existem credenciais salvas, tenta autenticar automaticamente
        loginContainer.classList.add('hidden');
        mainContent.classList.remove('hidden');
        logoutBtn.style.display = 'inline-block';
        loadFilesList();
    }
});

// Login
loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    credentials.email = document.getElementById('email').value;
    credentials.password = document.getElementById('password').value;

    // Salva as credenciais no localStorage
    saveCredentials(credentials.email, credentials.password);

    loginContainer.classList.add('hidden');
    mainContent.classList.remove('hidden');
    logoutBtn.style.display = 'inline-block';
    loadFilesList();
});

// Logout
logoutBtn.addEventListener('click', function () {
    clearCredentials();
    loginContainer.classList.remove('hidden');
    mainContent.classList.add('hidden');
    this.style.display = 'none';
});

// Função para requisições autenticadas
async function fetchAuth(url, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.append('Authorization', 'Basic ' + btoa(`${credentials.email}:${credentials.password}`));

    return fetch(url, {
        ...options,
        headers
    });
}

// Upload de vídeo
uploadForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const fileInput = document.getElementById('videoFile');
    const file = fileInput.files[0];

    if (!file) {
        showResult('Selecione um arquivo de vídeo!', 'error');
        return;
    }

    showLoading(true);
    const formData = new FormData();
    formData.append('video', file);

    try {
        const response = await fetchAuth('/api/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        showResult(result.message, response.ok ? 'success' : 'error');

        if (response.ok) {
            startAutoRefresh();
            toggleAutoRefresh.textContent = '⏸️ Parar Auto';
        }
    } catch (error) {
        showResult('Erro de conexão: ' + error.message, 'error');
    } finally {
        showLoading(false);
        fileInput.value = '';
    }
});

// Controles de atualização
refreshBtn.addEventListener('click', function () {
    loadFilesList();
});

toggleAutoRefresh.addEventListener('click', function () {
    if (isAutoRefreshEnabled) {
        stopAutoRefresh();
        toggleAutoRefresh.textContent = '▶️ Iniciar Auto';
        showResult('Atualização automática pausada', 'success');
    } else {
        startAutoRefresh();
        toggleAutoRefresh.textContent = '⏸️ Parar Auto';
        showResult('Atualização automática iniciada', 'success');
    }
});

function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    isAutoRefreshEnabled = true;
    updateRefreshStatus('Atualização automática iniciada');
    checkFilesStatus();
    refreshInterval = setInterval(checkFilesStatus, 1000);
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
    isAutoRefreshEnabled = false;
    updateRefreshStatus('Atualização automática pausada');
}

async function checkFilesStatus() {
    try {
        const response = await fetchAuth('/api/status');
        const data = await response.json();

        updateFilesList(data);
        updateRefreshStatus('Última atualização: ' + new Date().toLocaleTimeString());

        if (data.files?.length > 0) {
            // Verifica se TODOS os arquivos estão com status final (3 ou 4)
            const allFilesCompleted = data.files.every(file =>
                file.statusId === 3 || file.statusId === 4
            );

            if (allFilesCompleted) {
                stopAutoRefresh();
                toggleAutoRefresh.textContent = '▶️ Iniciar Auto';
                showResult('Todos os processamentos foram concluídos!', 'success');
            }
        }
    } catch (error) {
        console.error('Erro ao verificar status:', error);
        updateRefreshStatus('Erro ao atualizar: ' + error.message);
    }
}

async function loadFilesList() {
    updateRefreshStatus('Atualizando manualmente...');
    await checkFilesStatus();
}

// Atualiza a lista na UI
function updateFilesList(data) {
    if (data.files && data.files.length > 0) {
        filesList.innerHTML = `
                    <table class="files-table">
                        <thead>
                            <tr>
                                <th>Arquivo</th>
                                <th>Tamanho</th>
                                <th>Data</th>
                                <th>Status</th>
                                <th>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.files.map(file => {
            const downloadButton = file.statusId === 3
                ? `<a onclick="downloadFile('${file.filename}')" class="download-btn">⬇️ Download</a>`
                : '';

            return `
                                <tr title="${file.processingResult || ''}">
                                    <td class="filename">${file.filename}</td>
                                    <td class="file-size">${formatFileSize(file.size)}</td>
                                    <td class="file-date">${formatDate(file.created_at)}</td>
                                    <td class="file-status">${file.status}</td>
                                    <td class="file-action">${downloadButton}</td>
                                </tr>
                                `;
        }).join('')}
                        </tbody>
                    </table>
                `;
    } else {
        filesList.innerHTML = '<p class="no-files">Nenhum arquivo processado ainda.</p>';
    }
}

// Funções auxiliares
function showResult(message, type) {
    const result = document.getElementById('result');
    result.innerHTML = message;
    result.className = 'result ' + type;
    result.style.display = 'block';

    setTimeout(() => {
        result.style.display = 'none';
    }, 1000);
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function updateRefreshStatus(message) {
    refreshStatus.textContent = message;
}

function formatFileSize(bytes) {
    if (bytes == null) return '';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
}

async function downloadFile(filename) {
    try {
        const response = await fetchAuth(`/api/download/${filename}`);
        if (!response.ok) throw new Error('Failed to download file');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        showResult('Erro ao baixar arquivo: ' + error.message, 'error');
        console.error('Download error:', error);
    }
}