const { JSDOM } = require('jsdom');

describe('Login Form', () => {
  let document;

  beforeAll(() => {
    const dom = new JSDOM(`<!DOCTYPE html>${require('fs').readFileSync('index.html', 'utf8')}`);
    document = dom.window.document;
  });

  test('should display login form', () => {
    const loginForm = document.getElementById('loginForm');
    expect(loginForm).not.toBeNull();
  });

  test('should have email and password inputs', () => {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    expect(emailInput).not.toBeNull();
    expect(passwordInput).not.toBeNull();
  });
});