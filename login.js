document.addEventListener('DOMContentLoaded', () => {
    // Theme initialization
    const savedTheme = localStorage.getItem('theme') || 'light';
    const htmlEl = document.documentElement;

    if (savedTheme === 'dark') {
        htmlEl.classList.add('dark');
    } else {
        htmlEl.classList.remove('dark');
    }

    // Check if already logged in
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
        window.location.href = 'dashboard';
        return;
    }

    // DOM elements
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorBox = document.getElementById('error-box');
    const errorMsg = document.getElementById('error-msg');
    const togglePassword = document.getElementById('toggle-password');

    // Toggle Password Visibility
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.classList.toggle('fa-eye');
            togglePassword.classList.toggle('fa-eye-slash');
        });
    }

    // Login Form Submission
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            if (username === 'adm01' && password === 'admpas01') {
                errorBox.style.display = 'none';
                sessionStorage.setItem('isLoggedIn', 'true');
                window.location.href = 'dashboard';
            } else {
                errorBox.style.display = 'flex';
                errorMsg.textContent = 'Username atau password salah!';

                // Re-trigger shake animation
                errorBox.style.animation = 'none';
                void errorBox.offsetWidth; // trigger reflow
                errorBox.style.animation = 'shake 0.4s ease';
            }
        });
    }
});
