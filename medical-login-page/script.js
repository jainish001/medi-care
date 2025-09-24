// Medical Login Page JavaScript with Supabase Integration
import dbService from './ds.js';
import loginAPI from './login-api.js';

class MedicalLogin {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.togglePasswordBtn = document.getElementById('togglePassword');
        this.rememberMeCheckbox = document.getElementById('rememberMe');
        this.loginBtn = document.getElementById('loginBtn');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.successMessage = document.getElementById('successMessage');
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadRememberedCredentials();
        this.addAccessibilityFeatures();
    }

    bindEvents() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Real-time validation
        this.emailInput.addEventListener('blur', () => this.validateEmail());
        this.emailInput.addEventListener('input', () => this.clearError('email'));
        
        this.passwordInput.addEventListener('blur', () => this.validatePassword());
        this.passwordInput.addEventListener('input', () => this.clearError('password'));
        
        // Password toggle
        this.togglePasswordBtn.addEventListener('click', () => this.togglePassword());
        
        // Remember me functionality
        this.rememberMeCheckbox.addEventListener('change', () => this.handleRememberMe());
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));
    }

    validateEmail() {
        const email = this.emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const errorElement = document.getElementById('emailError');
        
        if (!email) {
            this.showError('email', 'Email address is required');
            return false;
        }
        
        if (!emailRegex.test(email)) {
            this.showError('email', 'Please enter a valid email address');
            return false;
        }
        
        // Additional validation for medical domain (optional)
        const medicalDomains = ['hospital.com', 'clinic.org', 'medical.edu', 'health.gov'];
        const domain = email.split('@')[1];
        
        this.clearError('email');
        return true;
    }

    validatePassword() {
        const password = this.passwordInput.value;
        const errorElement = document.getElementById('passwordError');
        
        if (!password) {
            this.showError('password', 'Password is required');
            return false;
        }
        
        if (password.length < 8) {
            this.showError('password', 'Password must be at least 8 characters long');
            return false;
        }
        
        // Strong password validation
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
            this.showError('password', 'Password must contain uppercase, lowercase, and numbers');
            return false;
        }
        
        this.clearError('password');
        return true;
    }

    showError(field, message) {
        const input = document.getElementById(field);
        const errorElement = document.getElementById(field + 'Error');
        
        input.classList.add('error');
        errorElement.textContent = message;
        errorElement.classList.add('show');
        
        // Add shake animation
        input.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            input.style.animation = '';
        }, 500);
    }

    clearError(field) {
        const input = document.getElementById(field);
        const errorElement = document.getElementById(field + 'Error');
        
        input.classList.remove('error');
        errorElement.textContent = '';
        errorElement.classList.remove('show');
    }

    togglePassword() {
        const type = this.passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        this.passwordInput.setAttribute('type', type);
        
        const icon = this.togglePasswordBtn.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
        
        // Update aria-label for accessibility
        this.togglePasswordBtn.setAttribute('aria-label', 
            type === 'password' ? 'Show password' : 'Hide password'
        );
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        // Clear previous errors
        this.clearError('email');
        this.clearError('password');
        
        // Validate form
        const isEmailValid = this.validateEmail();
        const isPasswordValid = this.validatePassword();
        
        if (!isEmailValid || !isPasswordValid) {
            this.shakeForm();
            return;
        }
        
        // Show loading state
        this.setLoadingState(true);
        
        try {
            // Authenticate user
            const result = await this.authenticateUser();
            
            if (result.success) {
                // Handle remember me
                if (this.rememberMeCheckbox.checked) {
                    this.saveCredentials();
                } else {
                    this.clearSavedCredentials();
                }
                
                // Store user session info
                if (result.user) {
                    localStorage.setItem('currentUser', JSON.stringify(result.user));
                    localStorage.setItem('medcare_session', JSON.stringify({ loggedIn: true, timestamp: new Date() }));
                    localStorage.setItem('medcare_user', JSON.stringify(result.user));
                }
                
                // Show success
                this.showSuccess();
            }
            
        } catch (error) {
            this.handleLoginError(error);
        } finally {
            this.setLoadingState(false);
        }
    }

    async authenticateUser() {
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;
        
        try {
            console.log('🔥 FRONTEND: Using real production login');
            
            // Use real production login API
            const result = await loginAPI.login(email, password);
            
            if (result.success) {
                return {
                    success: true,
                    user: result.user,
                    message: result.message
                };
            }
        } catch (error) {
            console.error('❌ FRONTEND: Real login failed:', error);
            throw new Error(error.message);
        }
    }

    setLoadingState(loading) {
        this.loginBtn.classList.toggle('loading', loading);
        this.loginBtn.disabled = loading;
        
        if (loading) {
            this.loginBtn.setAttribute('aria-label', 'Signing in, please wait');
        } else {
            this.loginBtn.setAttribute('aria-label', 'Sign in');
        }
    }

    showSuccess() {
        this.successMessage.classList.add('show');
        
        // Announce success to screen readers
        this.announceToScreenReader('Login successful! Redirecting to dashboard...');
        
        // Redirect after success
        setTimeout(() => {
            console.log('Redirecting to dashboard...');
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        }, 2000);
    }

    handleLoginError(error) {
        // Show error message
        this.showError('password', error.message);
        
        // Add error styling to form
        this.form.classList.add('error');
        setTimeout(() => {
            this.form.classList.remove('error');
        }, 3000);
        
        // Focus back to email for retry
        this.emailInput.focus();
    }

    shakeForm() {
        this.form.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            this.form.style.animation = '';
        }, 500);
    }

    saveCredentials() {
        if (this.rememberMeCheckbox.checked) {
            localStorage.setItem('medcare_remember_email', this.emailInput.value);
            localStorage.setItem('medcare_remember_me', 'true');
        }
    }

    loadRememberedCredentials() {
        const rememberedEmail = localStorage.getItem('medcare_remember_email');
        const rememberMe = localStorage.getItem('medcare_remember_me') === 'true';
        
        if (rememberMe && rememberedEmail) {
            this.emailInput.value = rememberedEmail;
            this.rememberMeCheckbox.checked = true;
            this.passwordInput.focus();
        }
    }

    clearSavedCredentials() {
        localStorage.removeItem('medcare_remember_email');
        localStorage.removeItem('medcare_remember_me');
    }

    // Session Management
    async checkExistingSession() {
        try {
            const session = await dbService.getCurrentSession();
            const user = await dbService.getCurrentUser();
            
            if (session && user) {
                console.log('Existing session found:', user.email);
                // Optionally auto-redirect or show logged-in state
                return { session, user };
            }
        } catch (error) {
            console.log('No existing session found');
        }
        
        return null;
    }

    async logout() {
        try {
            await dbService.signOut();
            localStorage.removeItem('medcare_session');
            localStorage.removeItem('medcare_user');
            console.log('Logged out successfully');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    handleRememberMe() {
        if (!this.rememberMeCheckbox.checked) {
            this.clearSavedCredentials();
        }
    }

    addAccessibilityFeatures() {
        // Add ARIA labels
        this.emailInput.setAttribute('aria-describedby', 'emailError');
        this.passwordInput.setAttribute('aria-describedby', 'passwordError');
        
        // Add role attributes
        document.getElementById('emailError').setAttribute('role', 'alert');
        document.getElementById('passwordError').setAttribute('role', 'alert');
        
        // Add live region for screen readers
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.id = 'liveRegion';
        document.body.appendChild(liveRegion);
    }

    handleKeyboardNavigation(e) {
        // Enter key on form elements
        if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
            e.preventDefault();
            
            if (e.target === this.emailInput) {
                this.passwordInput.focus();
            } else if (e.target === this.passwordInput) {
                this.loginBtn.click();
            }
        }
        
        // Escape key to clear errors
        if (e.key === 'Escape') {
            this.clearError('email');
            this.clearError('password');
        }
    }

    // Utility method to announce messages to screen readers
    announceToScreenReader(message) {
        const liveRegion = document.getElementById('liveRegion');
        if (liveRegion) {
            liveRegion.textContent = message;
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 1000);
        }
    }
}

// Add shake animation CSS
const shakeCSS = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
}

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}
`;

// Inject shake animation CSS
const style = document.createElement('style');
style.textContent = shakeCSS;
document.head.appendChild(style);

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const loginApp = new MedicalLogin();
    
    // Check for existing session
    const existingSession = await loginApp.checkExistingSession();
    if (existingSession) {
        // Show some indication that user is already logged in
        console.log('User already logged in:', existingSession.user.email);
    }
});

// Handle forgot password link
document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordLink = document.querySelector('.forgot-password');
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Simple forgot password simulation
        const email = document.getElementById('email').value.trim();
        
        if (!email) {
            alert('Please enter your email address first, then click "Forgot Password"');
            document.getElementById('email').focus();
            return;
        }
        
        // Simulate sending reset email
        alert(`Password reset instructions have been sent to ${email}\n\nPlease check your email for reset instructions.`);
    });
});

// Handle register link
document.addEventListener('DOMContentLoaded', () => {
    const registerLink = document.querySelector('.register-link');
    if (registerLink) {
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Redirect to registration page
            window.location.href = 'register.html';
        });
    }
});

// Add performance monitoring
window.addEventListener('load', () => {
    // Log page load performance
    const loadTime = performance.now();
    console.log(`Medical Login Page loaded in ${loadTime.toFixed(2)}ms`);
    
    // Check for any console errors
    window.addEventListener('error', (e) => {
        console.error('Login page error:', e.error);
    });
});

// Service Worker registration for offline capability (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment to enable service worker
        // navigator.serviceWorker.register('/sw.js')
        //     .then(registration => console.log('SW registered'))
        //     .catch(error => console.log('SW registration failed'));
    });
}
