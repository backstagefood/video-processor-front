const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe('Video Processor App', () => {
  let dom;
  let window;
  let document;
  let localStorageMock;

  beforeAll(() => {
    // Carrega o HTML para o ambiente JSDOM
    const html = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');
    dom = new JSDOM(html, {
      url: 'http://localhost',
      runScripts: 'dangerously', // Permite a execução de scripts
      resources: 'usable'
    });

    window = dom.window;
    document = window.document;

    // Configura o ambiente global para os testes
    global.window = window;
    global.document = document;
    global.localStorage = window.localStorage;

    // Mock do fetch
    global.fetch = jest.fn();

    // Carrega o arquivo JavaScript principal
    require('./index.js');
  });

  beforeEach(() => {
    // Limpa os mocks e o localStorage antes de cada teste
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  describe('Credenciais', () => {
    test('deve salvar credenciais no localStorage', () => {
      const email = 'test@example.com';
      const password = 'password123';

      // Assume que a função está disponível no escopo global
      window.saveCredentials(email, password);

      const savedCredentials = JSON.parse(window.localStorage.getItem('videoProcessorCredentials'));
      expect(savedCredentials.email).toBe(email);
      expect(savedCredentials.password).toBe(password);
    });

    test('deve carregar credenciais do localStorage', () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      window.localStorage.setItem('videoProcessorCredentials', JSON.stringify(credentials));

      const result = window.loadCredentials();

      expect(result).toBe(true);
      expect(window.credentials).toEqual(credentials);
    });

    test('deve retornar false quando não há credenciais salvas', () => {
      const result = window.loadCredentials();

      expect(result).toBe(false);
      expect(window.credentials).toEqual({ email: '', password: '' });
    });

    test('deve limpar credenciais do localStorage', () => {
      window.localStorage.setItem('videoProcessorCredentials', JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      }));

      window.clearCredentials();

      expect(window.localStorage.getItem('videoProcessorCredentials')).toBeNull();
      expect(window.credentials).toEqual({ email: '', password: '' });
    });
  });

  describe('Login/Logout', () => {
    beforeEach(() => {
      // Configura elementos do DOM necessários para os testes
      document.body.innerHTML = `
        <form id="loginForm">
          <input id="email" type="email">
          <input id="password" type="password">
        </form>
        <button id="logoutBtn"></button>
      `;
    });

    test('deve lidar com o envio do formulário de login', () => {
      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      const loginForm = document.getElementById('loginForm');

      emailInput.value = 'test@example.com';
      passwordInput.value = 'password123';

      const submitEvent = new window.Event('submit');
      loginForm.dispatchEvent(submitEvent);

      expect(window.credentials).toEqual({
        email: 'test@example.com',
        password: 'password123'
      });
      expect(window.localStorage.getItem('videoProcessorCredentials')).toBe(
        JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      );
    });

    test('deve lidar com logout', () => {
      const logoutBtn = document.getElementById('logoutBtn');

      // Configura credenciais iniciais
      window.credentials = { email: 'test@example.com', password: 'password123' };
      window.localStorage.setItem('videoProcessorCredentials', JSON.stringify(window.credentials));

      const clickEvent = new window.Event('click');
      logoutBtn.dispatchEvent(clickEvent);

      expect(window.credentials).toEqual({ email: '', password: '' });
      expect(window.localStorage.getItem('videoProcessorCredentials')).toBeNull();
    });
  });

  describe('Upload de Vídeo', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <form id="uploadForm">
          <input id="videoFile" type="file">
        </form>
      `;
    });

    test('deve enviar um arquivo de vídeo', async () => {
      const fileInput = document.getElementById('videoFile');
      const uploadForm = document.getElementById('uploadForm');

      // Mock do File
      const file = new window.File(['dummy content'], 'video.mp4', { type: 'video/mp4' });
      Object.defineProperty(fileInput, 'files', {
        value: [file]
      });

      // Mock da resposta do fetch
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Upload successful' })
      });

      const submitEvent = new window.Event('submit');
      uploadForm.dispatchEvent(submitEvent);

      expect(global.fetch).toHaveBeenCalledWith('/api/upload', expect.any(Object));
      expect(global.fetch.mock.calls[0][1].method).toBe('POST');
    });
  });

  describe('Auto Refresh', () => {
    test('deve iniciar e parar o auto-refresh', () => {
      window.startAutoRefresh();
      expect(window.isAutoRefreshEnabled).toBe(true);

      window.stopAutoRefresh();
      expect(window.isAutoRefreshEnabled).toBe(false);
    });
  });

  describe('Utilitários', () => {
    test('deve formatar tamanho de arquivo corretamente', () => {
      expect(window.formatFileSize(0)).toBe('0 Bytes');
      expect(window.formatFileSize(500)).toBe('500 Bytes');
      expect(window.formatFileSize(1024)).toBe('1 KB');
      expect(window.formatFileSize(1500)).toBe('1.46 KB');
      expect(window.formatFileSize(1048576)).toBe('1 MB');
    });

    test('deve formatar data corretamente', () => {
      const date = new Date('2023-01-01T12:00:00Z');
      expect(window.formatDate(date.toISOString())).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
    });

    test('deve baixar um arquivo', async () => {
      // Mock da resposta do fetch
      global.fetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => new window.Blob(['dummy content'], { type: 'application/octet-stream' })
      });

      await window.downloadFile('test.mp4');

      expect(global.fetch).toHaveBeenCalledWith('/api/download/test.mp4');
    });
  });
});