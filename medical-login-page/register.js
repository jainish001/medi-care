// Registration Page JavaScript with OTP Verification
import dbService from './ds.js';
import productionAPI from './production-api.js';

class MedicalRegistration {
    constructor() {
        this.registerForm = document.getElementById('registerForm');
        this.otpForm = document.getElementById('otpForm');
        this.successMessage = document.getElementById('successMessage');
        
        // Form inputs
        this.fullNameInput = document.getElementById('fullName');
        this.emailInput = document.getElementById('email');
        this.phoneInput = document.getElementById('phone');
        this.roleSelect = document.getElementById('role');
        this.departmentSelect = document.getElementById('department');
        this.passwordInput = document.getElementById('password');
        this.confirmPasswordInput = document.getElementById('confirmPassword');
        this.agreeTermsCheckbox = document.getElementById('agreeTerms');
        
        // Buttons
        this.registerBtn = document.getElementById('registerBtn');
        this.verifyBtn = document.getElementById('verifyBtn');
        this.resendBtn = document.getElementById('resendBtn');
        this.backBtn = document.getElementById('backBtn');
        
        // Toggle password buttons
        this.togglePasswordBtn = document.getElementById('togglePassword');
        this.toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
        
        // OTP inputs
        this.otpDigits = document.querySelectorAll('.otp-digit');
        this.otpTimer = document.getElementById('otpTimer');
        this.verificationEmail = document.getElementById('verificationEmail');
        
        // State
        this.currentStep = 1;
        this.otpTimerInterval = null;
        this.otpExpiryTime = null;
        this.registrationData = {};
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.addAccessibilityFeatures();
    }

    bindEvents() {
        // Registration form submission
        this.registerForm.addEventListener('submit', (e) => this.handleRegistration(e));
        
        // OTP form submission
        this.otpForm.addEventListener('submit', (e) => this.handleOTPVerification(e));
        
        // Real-time validation
        this.fullNameInput.addEventListener('blur', () => this.validateFullName());
        this.fullNameInput.addEventListener('input', () => this.clearError('fullName'));
        
        this.emailInput.addEventListener('blur', () => this.validateEmail());
        this.emailInput.addEventListener('input', () => this.clearError('email'));
        
        this.phoneInput.addEventListener('blur', () => this.validatePhone());
        this.phoneInput.addEventListener('input', () => this.clearError('phone'));
        
        this.roleSelect.addEventListener('change', () => this.validateRole());
        this.departmentSelect.addEventListener('change', () => this.validateDepartment());
        
        this.passwordInput.addEventListener('blur', () => this.validatePassword());
        this.passwordInput.addEventListener('input', () => this.clearError('password'));
        
        this.confirmPasswordInput.addEventListener('blur', () => this.validateConfirmPassword());
        this.confirmPasswordInput.addEventListener('input', () => this.clearError('confirmPassword'));
        
        // Password toggle
        this.togglePasswordBtn.addEventListener('click', () => this.togglePassword('password'));
        this.toggleConfirmPasswordBtn.addEventListener('click', () => this.togglePassword('confirmPassword'));
        
        // OTP input handling
        this.otpDigits.forEach((digit, index) => {
            digit.addEventListener('input', (e) => this.handleOTPInput(e, index));
            digit.addEventListener('keydown', (e) => this.handleOTPKeydown(e, index));
            digit.addEventListener('paste', (e) => this.handleOTPPaste(e));
        });
        
        // Button events
        this.resendBtn.addEventListener('click', () => this.resendOTP());
        this.backBtn.addEventListener('click', () => this.goBackToRegistration());
        
        // Terms and privacy links
        document.querySelector('.terms-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showTermsModal();
        });
        
        document.querySelector('.privacy-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showPrivacyModal();
        });
    }

    // Validation Methods
    validateFullName() {
        const fullName = this.fullNameInput.value.trim();
        
        if (!fullName) {
            this.showError('fullName', 'Full name is required');
            return false;
        }
        
        if (fullName.length < 2) {
            this.showError('fullName', 'Full name must be at least 2 characters');
            return false;
        }
        
        if (!/^[a-zA-Z\s'-]+$/.test(fullName)) {
            this.showError('fullName', 'Full name can only contain letters, spaces, hyphens, and apostrophes');
            return false;
        }
        
        this.clearError('fullName');
        return true;
    }

    validateEmail() {
        const email = this.emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            this.showError('email', 'Email address is required');
            return false;
        }
        
        if (!emailRegex.test(email)) {
            this.showError('email', 'Please enter a valid email address');
            return false;
        }
        
        this.clearError('email');
        return true;
    }

    validatePhone() {
        const phone = this.phoneInput.value.trim();
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        
        if (!phone) {
            this.showError('phone', 'Phone number is required');
            return false;
        }
        
        // Remove all non-digit characters for validation
        const cleanPhone = phone.replace(/\D/g, '');
        
        if (cleanPhone.length < 10) {
            this.showError('phone', 'Phone number must be at least 10 digits');
            return false;
        }
        
        this.clearError('phone');
        return true;
    }

    validateRole() {
        const role = this.roleSelect.value;
        
        if (!role) {
            this.showError('role', 'Please select your role');
            return false;
        }
        
        this.clearError('role');
        return true;
    }

    validateDepartment() {
        const department = this.departmentSelect.value;
        
        if (!department) {
            this.showError('department', 'Please select your department');
            return false;
        }
        
        this.clearError('department');
        return true;
    }

    validatePassword() {
        const password = this.passwordInput.value;
        
        if (!password) {
            this.showError('password', 'Password is required');
            return false;
        }
        
        if (password.length < 8) {
            this.showError('password', 'Password must be at least 8 characters long');
            return false;
        }
        
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        if (!hasUpperCase) {
            this.showError('password', 'Password must contain at least one uppercase letter');
            return false;
        }
        
        if (!hasLowerCase) {
            this.showError('password', 'Password must contain at least one lowercase letter');
            return false;
        }
        
        if (!hasNumbers) {
            this.showError('password', 'Password must contain at least one number');
            return false;
        }
        
        if (!hasSpecialChar) {
            this.showError('password', 'Password must contain at least one special character');
            return false;
        }
        
        this.clearError('password');
        return true;
    }

    validateConfirmPassword() {
        const password = this.passwordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;
        
        if (!confirmPassword) {
            this.showError('confirmPassword', 'Please confirm your password');
            return false;
        }
        
        if (password !== confirmPassword) {
            this.showError('confirmPassword', 'Passwords do not match');
            return false;
        }
        
        this.clearError('confirmPassword');
        return true;
    }

    validateTermsAgreement() {
        if (!this.agreeTermsCheckbox.checked) {
            this.showError('agreeTerms', 'You must agree to the Terms of Service and Privacy Policy');
            return false;
        }
        
        return true;
    }

    // Registration Handler
    async handleRegistration(e) {
        e.preventDefault();
        
        // Clear previous errors
        this.clearAllErrors();
        
        // Validate all fields
        const validations = [
            this.validateFullName(),
            this.validateEmail(),
            this.validatePhone(),
            this.validateRole(),
            this.validateDepartment(),
            this.validatePassword(),
            this.validateConfirmPassword(),
            this.validateTermsAgreement()
        ];
        
        if (!validations.every(v => v)) {
            this.shakeForm(this.registerForm);
            return;
        }
        
        // Show loading state
        this.setLoadingState(this.registerBtn, true);
        
        try {
            // Prepare registration data
            this.registrationData = {
                fullName: this.fullNameInput.value.trim(),
                email: this.emailInput.value.trim(),
                phone: this.phoneInput.value.trim(),
                role: this.roleSelect.value,
                department: this.departmentSelect.value,
                password: this.passwordInput.value
            };
            
            // Send OTP using Production API
            console.log('🔥 FRONTEND: Using Production API for OTP');
            const result = await productionAPI.requestOTP(this.registrationData.email);
            
            if (result.success) {
                // Set expiry time (5 minutes from now)
                this.otpExpiryTime = new Date(Date.now() + (result.expiresIn * 1000));
                this.showOTPForm();
                this.startOTPTimer();
                console.log('✅ FRONTEND: OTP form shown, timer started');
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('email', error.message);
        } finally {
            this.setLoadingState(this.registerBtn, false);
        }
    }

    // OTP Verification Handler
    async handleOTPVerification(e) {
        e.preventDefault();
        
        const otpCode = this.getOTPCode();
        
        if (!otpCode || otpCode.length !== 6) {
            this.showOTPError('Please enter the complete 6-digit code');
            return;
        }
        
        this.setLoadingState(this.verifyBtn, true);
        
        try {
            console.log('🔥 FRONTEND: Using Production API for OTP verification');
            
            // Step 1: Verify OTP
            await productionAPI.verifyOTP(this.registrationData.email, otpCode);
            console.log('✅ FRONTEND: OTP verified successfully');
            
            // Step 2: Register user
            const registerResult = await productionAPI.registerUser(
                this.registrationData.email,
                this.registrationData.fullName,
                this.registrationData.phone,
                25 // Default age, you can make this dynamic
            );
            
            console.log('✅ FRONTEND: User registered successfully', registerResult);
            
            this.clearOTPTimer();
            this.showSuccessMessage();
            
        } catch (error) {
            console.error('❌ FRONTEND: OTP verification/registration error:', error);
            this.showOTPError(error.message);
            this.shakeOTPInputs();
        } finally {
            this.setLoadingState(this.verifyBtn, false);
        }
    }

    // OTP Input Handling
    handleOTPInput(e, index) {
        const value = e.target.value;
        
        // Only allow digits
        if (!/^\d$/.test(value) && value !== '') {
            e.target.value = '';
            return;
        }
        
        if (value) {
            e.target.classList.add('filled');
            
            // Move to next input
            if (index < this.otpDigits.length - 1) {
                this.otpDigits[index + 1].focus();
            }
        } else {
            e.target.classList.remove('filled');
        }
        
        this.clearOTPError();
    }

    handleOTPKeydown(e, index) {
        // Handle backspace
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            this.otpDigits[index - 1].focus();
            this.otpDigits[index - 1].value = '';
            this.otpDigits[index - 1].classList.remove('filled');
        }
        
        // Handle arrow keys
        if (e.key === 'ArrowLeft' && index > 0) {
            this.otpDigits[index - 1].focus();
        }
        
        if (e.key === 'ArrowRight' && index < this.otpDigits.length - 1) {
            this.otpDigits[index + 1].focus();
        }
    }

    handleOTPPaste(e) {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
        
        if (pastedData.length === 6) {
            this.otpDigits.forEach((digit, index) => {
                digit.value = pastedData[index] || '';
                if (digit.value) {
                    digit.classList.add('filled');
                } else {
                    digit.classList.remove('filled');
                }
            });
            
            this.otpDigits[5].focus();
            this.clearOTPError();
        }
    }

    getOTPCode() {
        return Array.from(this.otpDigits).map(digit => digit.value).join('');
    }

    clearOTPInputs() {
        this.otpDigits.forEach(digit => {
            digit.value = '';
            digit.classList.remove('filled', 'error');
        });
        this.otpDigits[0].focus();
    }

    shakeOTPInputs() {
        this.otpDigits.forEach(digit => {
            digit.classList.add('error');
            setTimeout(() => {
                digit.classList.remove('error');
            }, 500);
        });
    }

    // OTP Timer
    startOTPTimer() {
        if (!this.otpExpiryTime) return;
        
        this.otpTimerInterval = setInterval(() => {
            const now = new Date();
            const timeLeft = this.otpExpiryTime - now;
            
            if (timeLeft <= 0) {
                this.clearOTPTimer();
                this.enableResendButton();
                this.otpTimer.textContent = '00:00';
                this.otpTimer.style.color = '#e74c3c';
                return;
            }
            
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            
            this.otpTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Change color when time is running out
            if (timeLeft < 60000) { // Less than 1 minute
                this.otpTimer.style.color = '#e74c3c';
            } else {
                this.otpTimer.style.color = '#666';
            }
        }, 1000);
    }

    clearOTPTimer() {
        if (this.otpTimerInterval) {
            clearInterval(this.otpTimerInterval);
            this.otpTimerInterval = null;
        }
    }

    enableResendButton() {
        this.resendBtn.disabled = false;
        this.resendBtn.textContent = 'Resend Code';
    }

    // Resend OTP
    async resendOTP() {
        this.setLoadingState(this.resendBtn, true);
        this.resendBtn.disabled = true;
        
        try {
            const result = await dbService.resendOTP(this.registrationData.email);
            
            if (result.success) {
                this.otpExpiryTime = result.expiryTime;
                this.clearOTPInputs();
                this.startOTPTimer();
                this.clearOTPError();
                
                // Show success feedback
                this.showTemporaryMessage('New verification code sent!', 'success');
            }
            
        } catch (error) {
            console.error('Resend OTP error:', error);
            this.showOTPError(error.message);
            this.enableResendButton();
        } finally {
            this.setLoadingState(this.resendBtn, false);
        }
    }

    // Navigation Methods
    showOTPForm() {
        this.registerForm.style.display = 'none';
        this.otpForm.style.display = 'block';
        this.verificationEmail.textContent = this.registrationData.email;
        this.currentStep = 2;
        
        // Focus first OTP input
        setTimeout(() => {
            this.otpDigits[0].focus();
        }, 100);
    }

    goBackToRegistration() {
        this.otpForm.style.display = 'none';
        this.registerForm.style.display = 'block';
        this.currentStep = 1;
        this.clearOTPTimer();
        this.clearOTPInputs();
        this.clearOTPError();
    }

    showSuccessMessage() {
        this.otpForm.style.display = 'none';
        this.successMessage.style.display = 'block';
        this.currentStep = 3;
        
        // Store user data for dashboard
        localStorage.setItem('currentUser', JSON.stringify({
            name: this.registrationData.fullName,
            email: this.registrationData.email,
            phone: this.registrationData.phone,
            role: this.registrationData.role,
            department: this.registrationData.department
        }));
        
        // Add confetti effect
        this.showConfetti();
        
        // Redirect to dashboard after success
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 3000);
    }

    // Utility Methods
    togglePassword(fieldName) {
        const input = document.getElementById(fieldName);
        const button = document.getElementById(`toggle${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`);
        const icon = button.querySelector('i');
        
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
        
        button.setAttribute('aria-label', 
            type === 'password' ? 'Show password' : 'Hide password'
        );
    }

    showError(field, message) {
        const input = document.getElementById(field);
        const errorElement = document.getElementById(field + 'Error');
        
        if (input) {
            input.classList.add('error');
        }
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
        
        // Add shake animation
        if (input) {
            input.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
                input.style.animation = '';
            }, 500);
        }
    }

    clearError(field) {
        const input = document.getElementById(field);
        const errorElement = document.getElementById(field + 'Error');
        
        if (input) {
            input.classList.remove('error');
        }
        
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('show');
        }
    }

    clearAllErrors() {
        const fields = ['fullName', 'email', 'phone', 'role', 'department', 'password', 'confirmPassword'];
        fields.forEach(field => this.clearError(field));
    }

    showOTPError(message) {
        const errorElement = document.getElementById('otpError');
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }

    clearOTPError() {
        const errorElement = document.getElementById('otpError');
        errorElement.textContent = '';
        errorElement.classList.remove('show');
    }

    setLoadingState(button, loading) {
        button.classList.toggle('loading', loading);
        button.disabled = loading;
        
        const spinner = button.querySelector('.loading-spinner');
        const text = button.querySelector('.btn-text');
        
        if (loading) {
            if (spinner) spinner.style.opacity = '1';
            if (text) text.style.opacity = '0';
        } else {
            if (spinner) spinner.style.opacity = '0';
            if (text) text.style.opacity = '1';
        }
    }

    shakeForm(form) {
        form.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            form.style.animation = '';
        }, 500);
    }

    showTemporaryMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `temp-message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#27ae60' : '#2c5aa0'};
            color: white;
            border-radius: 8px;
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(messageDiv);
            }, 300);
        }, 3000);
    }

    showConfetti() {
        // Simple confetti effect
        const colors = ['#2c5aa0', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6'];
        
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.style.cssText = `
                    position: fixed;
                    width: 10px;
                    height: 10px;
                    background: ${colors[Math.floor(Math.random() * colors.length)]};
                    top: -10px;
                    left: ${Math.random() * 100}vw;
                    z-index: 1000;
                    border-radius: 50%;
                    animation: confettiFall 3s linear forwards;
                `;
                
                document.body.appendChild(confetti);
                
                setTimeout(() => {
                    if (document.body.contains(confetti)) {
                        document.body.removeChild(confetti);
                    }
                }, 3000);
            }, i * 100);
        }
    }

    showTermsModal() {
        alert('Terms of Service\n\nThis is a demo application. In a real application, this would show the complete terms of service.');
    }

    showPrivacyModal() {
        alert('Privacy Policy\n\nThis is a demo application. In a real application, this would show the complete privacy policy.');
    }

    addAccessibilityFeatures() {
        // Add ARIA labels
        this.otpDigits.forEach((digit, index) => {
            digit.setAttribute('aria-label', `Digit ${index + 1} of verification code`);
        });
        
        // Add live region for screen readers
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.id = 'registerLiveRegion';
        document.body.appendChild(liveRegion);
    }

    announceToScreenReader(message) {
        const liveRegion = document.getElementById('registerLiveRegion');
        if (liveRegion) {
            liveRegion.textContent = message;
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 1000);
        }
    }
}

// Add additional CSS for animations
const additionalCSS = `
@keyframes slideInRight {
    from {
        opacity: 0;
        transform: translateX(100px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes slideOutRight {
    from {
        opacity: 1;
        transform: translateX(0);
    }
    to {
        opacity: 0;
        transform: translateX(100px);
    }
}

@keyframes confettiFall {
    to {
        transform: translateY(100vh) rotate(360deg);
        opacity: 0;
    }
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

// Inject additional CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);

// Initialize the registration application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MedicalRegistration();
});

// Handle browser back button
window.addEventListener('popstate', (e) => {
    if (window.location.pathname.includes('register')) {
        // Handle navigation within registration flow
        console.log('Registration page navigation');
    }
});

// Performance monitoring
window.addEventListener('load', () => {
    const loadTime = performance.now();
    console.log(`Medical Registration Page loaded in ${loadTime.toFixed(2)}ms`);
});
