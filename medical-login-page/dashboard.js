// Dashboard JavaScript
class Dashboard {
    constructor() {
        this.currentUser = null;
        this.isEditMode = false;
        this.init();
    }

    async init() {
        try {
            // Check if user is logged in
            await this.checkAuthentication();
            
            // Load user data
            await this.loadUserData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Show dashboard by default
            showSection('dashboard');
            
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            this.redirectToLogin();
        }
    }

    async checkAuthentication() {
        // Check if user data exists in localStorage
        const userData = localStorage.getItem('currentUser');
        const sessionData = localStorage.getItem('medcare_session');
        
        if (!userData) {
            throw new Error('No user data found');
        }
        
        this.currentUser = JSON.parse(userData);
        
        // Check if session exists and is valid
        if (sessionData) {
            const session = JSON.parse(sessionData);
            if (session.loggedIn) {
                console.log('✅ Valid session found for user:', this.currentUser.email);
                return; // Session is valid, no need to verify with backend
            }
        }
        
        // If no valid session, still allow access but log warning
        console.warn('⚠️ No valid session found, but user data exists. Allowing access.');
    }

    async loadUserData() {
        if (!this.currentUser) return;

        try {
            // Fetch fresh user data from Supabase database
            console.log('🔄 Fetching user profile from database...');
            const response = await fetch(`http://localhost:3001/user/profile/${encodeURIComponent(this.currentUser.email)}`);
            
            if (response.ok) {
                const result = await response.json();
                if (result.status === 'success' && result.user) {
                    // Update currentUser with fresh data from database
                    this.currentUser = {
                        ...this.currentUser,
                        ...result.user,
                        // Map database fields to frontend fields
                        bloodType: result.user.blood_type,
                        emergencyContact: result.user.emergency_contact,
                        medicalConditions: result.user.medical_conditions
                    };
                    
                    // Update localStorage with fresh data
                    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                    console.log('✅ User profile loaded from database');
                } else {
                    console.warn('⚠️ No user data returned from database, using localStorage data');
                }
            } else {
                console.warn('⚠️ Failed to fetch user profile from database, using localStorage data');
            }
        } catch (error) {
            console.warn('⚠️ Error fetching user profile from database:', error.message);
            console.log('Using localStorage data as fallback');
        }

        // Update header user info
        document.getElementById('user-name').textContent = this.currentUser.name || 'User';
        
        // Update profile section
        document.getElementById('profile-name').textContent = this.currentUser.name || 'User';
        document.getElementById('profile-email').textContent = this.currentUser.email || '';
        
        // Fill profile form with database data
        document.getElementById('full-name').value = this.currentUser.name || '';
        document.getElementById('email').value = this.currentUser.email || '';
        document.getElementById('phone').value = this.currentUser.phone || '';
        document.getElementById('age').value = this.currentUser.age || '';
        
        // Set additional fields if available
        if (this.currentUser.gender) {
            document.getElementById('gender').value = this.currentUser.gender;
        }
        if (this.currentUser.bloodType || this.currentUser.blood_type) {
            document.getElementById('blood-type').value = this.currentUser.bloodType || this.currentUser.blood_type;
        }
        if (this.currentUser.address) {
            document.getElementById('address').value = this.currentUser.address;
        }
        if (this.currentUser.emergencyContact || this.currentUser.emergency_contact) {
            document.getElementById('emergency-contact').value = this.currentUser.emergencyContact || this.currentUser.emergency_contact;
        }
        if (this.currentUser.allergies) {
            document.getElementById('allergies').value = this.currentUser.allergies;
        }
        if (this.currentUser.medicalConditions || this.currentUser.medical_conditions) {
            document.getElementById('medical-conditions').value = this.currentUser.medicalConditions || this.currentUser.medical_conditions;
        }
    }

    setupEventListeners() {
        // Profile edit functionality
        document.getElementById('edit-profile-btn').addEventListener('click', () => {
            this.toggleEditMode(true);
        });

        document.getElementById('cancel-edit-btn').addEventListener('click', () => {
            this.toggleEditMode(false);
            this.loadUserData(); // Reset form data
        });

        document.getElementById('profile-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProfile();
        });

        // Sidebar toggle for mobile
        const menuToggle = document.querySelector('.menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }
    }

    toggleEditMode(editMode) {
        this.isEditMode = editMode;
        
        const formElements = document.querySelectorAll('#profile-form input, #profile-form select, #profile-form textarea');
        const editBtn = document.getElementById('edit-profile-btn');
        const saveBtn = document.getElementById('save-profile-btn');
        const cancelBtn = document.getElementById('cancel-edit-btn');
        
        formElements.forEach(element => {
            if (element.name === 'email') {
                // Email should always be readonly
                return;
            }
            
            if (editMode) {
                element.removeAttribute('readonly');
                element.removeAttribute('disabled');
            } else {
                element.setAttribute('readonly', 'readonly');
                if (element.tagName === 'SELECT') {
                    element.setAttribute('disabled', 'disabled');
                }
            }
        });

        // Medical info fields
        const medicalFields = document.querySelectorAll('#emergency-contact, #allergies, #medical-conditions');
        medicalFields.forEach(field => {
            if (editMode) {
                field.removeAttribute('readonly');
            } else {
                field.setAttribute('readonly', 'readonly');
            }
        });
        
        if (editMode) {
            editBtn.style.display = 'none';
            saveBtn.style.display = 'flex';
            cancelBtn.style.display = 'flex';
        } else {
            editBtn.style.display = 'flex';
            saveBtn.style.display = 'none';
            cancelBtn.style.display = 'none';
        }
    }

    async saveProfile() {
        try {
            console.log('🔄 Starting profile update...');
            
            const formData = new FormData(document.getElementById('profile-form'));
            const profileData = {
                name: formData.get('name'),
                phone: formData.get('phone'),
                age: formData.get('age'),
                gender: formData.get('gender'),
                bloodType: formData.get('bloodType'),
                address: formData.get('address'),
                emergencyContact: document.getElementById('emergency-contact').value,
                allergies: document.getElementById('allergies').value,
                medicalConditions: document.getElementById('medical-conditions').value
            };

            console.log('📝 Profile data to update:', profileData);
            console.log('👤 Current user email:', this.currentUser.email);

            // Show loading state
            this.showMessage('Updating profile...', 'info');

            // Check if server is reachable first
            try {
                const healthCheck = await fetch('http://localhost:3001/health', {
                    method: 'GET',
                    timeout: 5000
                });
                
                if (!healthCheck.ok) {
                    throw new Error('Backend server is not responding');
                }
                
                console.log('✅ Backend server is reachable');
            } catch (serverError) {
                console.error('❌ Backend server check failed:', serverError);
                throw new Error('Cannot connect to server. Please ensure the backend is running on http://localhost:3001');
            }

            // Update backend
            const response = await fetch('http://localhost:3001/auth/update-profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: this.currentUser.email,
                    ...profileData
                })
            });

            console.log('📡 Response status:', response.status);
            console.log('📡 Response ok:', response.ok);

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Profile update successful:', result);
                
                // Update local user data with the returned data
                if (result.user) {
                    this.currentUser = { ...this.currentUser, ...result.user };
                } else {
                    this.currentUser = { ...this.currentUser, ...profileData };
                }
                
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                
                // Update display
                document.getElementById('user-name').textContent = this.currentUser.name;
                document.getElementById('profile-name').textContent = this.currentUser.name;
                
                this.toggleEditMode(false);
                this.showMessage('Profile updated successfully!', 'success');
            } else {
                const errorData = await response.json();
                console.error('❌ Profile update failed:', errorData);
                
                let errorMessage = 'Failed to update profile';
                
                if (response.status === 404) {
                    errorMessage = 'User not found. Please try logging in again.';
                } else if (response.status === 500) {
                    errorMessage = errorData.message || 'Server error occurred while updating profile';
                } else {
                    errorMessage = errorData.message || errorData.error || 'Failed to update profile';
                }
                
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('❌ Profile update error:', error);
            
            let userMessage = 'Failed to update profile';
            
            if (error.message.includes('fetch')) {
                userMessage = 'Cannot connect to server. Please check if the backend is running.';
            } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
                userMessage = 'Network error. Please check your connection and ensure the backend server is running on http://localhost:3004';
            } else {
                userMessage = error.message;
            }
            
            this.showMessage(userMessage, 'error');
        }
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());
        
        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        else if (type === 'error') icon = 'exclamation-circle';
        else if (type === 'info') icon = 'spinner fa-spin';
        
        messageDiv.innerHTML = `
            <i class="fas fa-${icon}"></i>
            ${message}
        `;
        
        // Insert at top of profile section
        const profileSection = document.querySelector('.profile-container');
        if (profileSection) {
            profileSection.insertBefore(messageDiv, profileSection.firstChild);
        }
        
        // Auto remove after 5 seconds (except for loading messages)
        if (type !== 'info') {
            setTimeout(() => {
                messageDiv.remove();
            }, 5000);
        }
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('active');
    }

    redirectToLogin() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('medcare_session');
        localStorage.removeItem('medcare_user');
        window.location.href = 'index.html';
    }
}

// Global functions for HTML onclick events
function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update page title
    const pageTitle = document.getElementById('page-title');
    pageTitle.textContent = sectionName.charAt(0).toUpperCase() + sectionName.slice(1).replace('-', ' ');
    
    // Update active menu item
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.classList.remove('active');
    });
    
    const activeMenuItem = document.querySelector(`[onclick="showSection('${sectionName}')"]`).parentElement;
    activeMenuItem.classList.add('active');
}

function toggleSidebar() {
    if (window.dashboardInstance) {
        window.dashboardInstance.toggleSidebar();
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear all session data
        localStorage.removeItem('currentUser');
        localStorage.removeItem('medcare_session');
        localStorage.removeItem('medcare_user');
        localStorage.removeItem('medcare_remember_email');
        localStorage.removeItem('medcare_remember_me');
        
        // Redirect to login
        window.location.href = 'index.html';
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardInstance = new Dashboard();
});

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.section) {
        showSection(event.state.section);
    }
});

// Add some demo data loading for stats
function loadDashboardStats() {
    // This would typically come from your backend API
    const stats = {
        appointments: Math.floor(Math.random() * 10) + 1,
        records: Math.floor(Math.random() * 20) + 5,
        prescriptions: Math.floor(Math.random() * 5) + 1,
        healthScore: Math.floor(Math.random() * 20) + 80
    };
    
    // Update stat cards
    const statNumbers = document.querySelectorAll('.stat-number');
    if (statNumbers.length >= 4) {
        statNumbers[0].textContent = stats.appointments;
        statNumbers[1].textContent = stats.records;
        statNumbers[2].textContent = stats.prescriptions;
        statNumbers[3].textContent = stats.healthScore + '%';
    }
}

// Load stats after a short delay
setTimeout(loadDashboardStats, 1000);

// Health MVP functionality
function openHealthMVP() {
    console.log('🏥 Opening Health & Emergency Management (Health MVP)');
    
    // Show a modal or alert for now (placeholder functionality)
    const healthMVPModal = createHealthMVPModal();
    document.body.appendChild(healthMVPModal);
    
    // Add event listener to close modal
    healthMVPModal.addEventListener('click', (e) => {
        if (e.target === healthMVPModal || e.target.classList.contains('close-modal')) {
            document.body.removeChild(healthMVPModal);
        }
    });
}

function createHealthMVPModal() {
    const modal = document.createElement('div');
    modal.className = 'health-mvp-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-shield-alt"></i> Health & Emergency Management</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="mvp-section">
                    <h3>🚀 Health MVP Features</h3>
                    <p>Welcome to the Health & Emergency Management system. This is a placeholder for the Health MVP functionality.</p>
                    
                    <div class="feature-grid">
                        <div class="feature-card">
                            <i class="fas fa-ambulance"></i>
                            <h4>Emergency Services</h4>
                            <p>Quick access to emergency contacts and services</p>
                        </div>
                        
                        <div class="feature-card">
                            <i class="fas fa-heart-pulse"></i>
                            <h4>Health Monitoring</h4>
                            <p>Track vital signs and health metrics</p>
                        </div>
                        
                        <div class="feature-card">
                            <i class="fas fa-pills"></i>
                            <h4>Medication Management</h4>
                            <p>Manage prescriptions and medication schedules</p>
                        </div>
                        
                        <div class="feature-card">
                            <i class="fas fa-user-md"></i>
                            <h4>Healthcare Providers</h4>
                            <p>Connect with healthcare professionals</p>
                        </div>
                    </div>
                    
                    <div class="mvp-status">
                        <p><strong>Status:</strong> <span class="status-badge">In Development</span></p>
                        <p>More features will be added to this Health MVP section soon!</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary close-modal">Close</button>
            </div>
        </div>
    `;
    
    return modal;
}

// =====================================================
// MEDICATION TRACKER FUNCTIONALITY
// =====================================================

class MedicationTracker {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.medicineStock = [];
        this.userMedicines = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.generateCalendar();
        this.loadMedicineStock();
        this.loadTodaysMedicines();
    }

    setupEventListeners() {
        // Calendar navigation
        const prevMonthBtn = document.getElementById('prev-month');
        const nextMonthBtn = document.getElementById('next-month');
        
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.generateCalendar();
            });
        }
        
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.generateCalendar();
            });
        }

        // Refresh stock button
        const refreshStockBtn = document.getElementById('refresh-stock');
        if (refreshStockBtn) {
            refreshStockBtn.addEventListener('click', () => {
                this.loadMedicineStock();
            });
        }

        // Add medicine form
        const addMedicineForm = document.getElementById('add-medicine-form');
        if (addMedicineForm) {
            addMedicineForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addMedicine();
            });
        }

        // Medicine name dropdown change
        const medicineNameSelect = document.getElementById('medicine-name');
        if (medicineNameSelect) {
            medicineNameSelect.addEventListener('change', (e) => {
                this.updateStockInfo(e.target.value);
            });
        }
    }

    generateCalendar() {
        const calendar = document.getElementById('medication-calendar');
        const monthYearDisplay = document.getElementById('current-month-year');
        
        if (!calendar || !monthYearDisplay) return;

        // Update month/year display
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        monthYearDisplay.textContent = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;

        // Clear calendar
        calendar.innerHTML = '';

        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-header';
            header.textContent = day;
            calendar.appendChild(header);
        });

        // Get first day of month and number of days
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // Generate calendar days
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            // Add classes for styling
            if (date.getMonth() !== this.currentDate.getMonth()) {
                dayElement.classList.add('other-month');
            }
            
            if (this.isToday(date)) {
                dayElement.classList.add('today');
            }
            
            if (this.isSameDate(date, this.selectedDate)) {
                dayElement.classList.add('selected');
            }

            // Day number
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = date.getDate();
            dayElement.appendChild(dayNumber);

            // Add click event
            dayElement.addEventListener('click', () => {
                this.selectDate(date);
            });

            calendar.appendChild(dayElement);
        }
    }

    selectDate(date) {
        this.selectedDate = new Date(date);
        this.generateCalendar();
        this.loadMedicinesForDate(date);
        this.updateSelectedDateDisplay();
    }

    updateSelectedDateDisplay() {
        const display = document.getElementById('selected-date-display');
        if (display) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            display.textContent = this.selectedDate.toLocaleDateString('en-US', options);
        }
    }

    isToday(date) {
        const today = new Date();
        return this.isSameDate(date, today);
    }

    isSameDate(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }

    async loadMedicineStock() {
        try {
            const response = await fetch('http://localhost:3001/api/medicine-stock');
            const result = await response.json();
            
            if (result.status === 'success') {
                this.medicineStock = result.data;
                this.displayMedicineStock();
                this.populateMedicineDropdown();
            } else {
                console.error('Failed to load medicine stock:', result);
                this.showError('Failed to load medicine stock');
            }
        } catch (error) {
            console.error('Error loading medicine stock:', error);
            this.showError('Cannot connect to server. Please ensure the backend is running.');
        }
    }

    displayMedicineStock() {
        const stockList = document.getElementById('medicine-stock-list');
        if (!stockList) return;

        if (this.medicineStock.length === 0) {
            stockList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-pills"></i>
                    <h4>No Medicine Stock</h4>
                    <p>No medicines available in stock</p>
                </div>
            `;
            return;
        }

        stockList.innerHTML = this.medicineStock.map(medicine => {
            const stockLevel = this.getStockLevel(medicine.stock_quantity, medicine.low_stock_threshold);
            const progressPercentage = Math.min((medicine.stock_quantity / (medicine.low_stock_threshold * 3)) * 100, 100);
            
            return `
                <div class="stock-item">
                    <div class="stock-item-header">
                        <h4 class="stock-item-name">${medicine.name}</h4>
                        <span class="stock-quantity ${stockLevel}">${medicine.stock_quantity} ${medicine.unit}</span>
                    </div>
                    <p class="stock-description">${medicine.description || 'No description available'}</p>
                    <div class="stock-bar">
                        <div class="stock-progress ${stockLevel}" style="width: ${progressPercentage}%"></div>
                    </div>
                    <div class="stock-info-text">
                        <span>Low stock: ${medicine.low_stock_threshold} ${medicine.unit}</span>
                        <span>${stockLevel.charAt(0).toUpperCase() + stockLevel.slice(1)} stock</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    populateMedicineDropdown() {
        const dropdown = document.getElementById('medicine-name');
        if (!dropdown) return;

        dropdown.innerHTML = '<option value="">Select Medicine</option>';
        
        this.medicineStock.forEach(medicine => {
            const option = document.createElement('option');
            option.value = medicine.name;
            option.textContent = `${medicine.name} (${medicine.stock_quantity} ${medicine.unit} available)`;
            option.dataset.stockId = medicine.id;
            option.dataset.stock = medicine.stock_quantity;
            dropdown.appendChild(option);
        });
    }

    updateStockInfo(medicineName) {
        const stockInfo = document.getElementById('stock-info');
        if (!stockInfo) return;

        if (!medicineName) {
            stockInfo.classList.remove('show');
            return;
        }

        const medicine = this.medicineStock.find(m => m.name === medicineName);
        if (!medicine) return;

        stockInfo.classList.add('show');
        
        if (medicine.stock_quantity <= 0) {
            stockInfo.className = 'stock-info show out';
            stockInfo.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Out of stock`;
        } else if (medicine.stock_quantity <= medicine.low_stock_threshold) {
            stockInfo.className = 'stock-info show low';
            stockInfo.innerHTML = `<i class="fas fa-exclamation-circle"></i> Low stock: ${medicine.stock_quantity} ${medicine.unit} remaining`;
        } else {
            stockInfo.className = 'stock-info show available';
            stockInfo.innerHTML = `<i class="fas fa-check-circle"></i> Available: ${medicine.stock_quantity} ${medicine.unit} in stock`;
        }
    }

    getStockLevel(quantity, threshold) {
        if (quantity <= 0) return 'low';
        if (quantity <= threshold) return 'low';
        if (quantity <= threshold * 2) return 'medium';
        return 'high';
    }

    async loadTodaysMedicines() {
        const today = new Date().toISOString().split('T')[0];
        await this.loadMedicinesForDate(new Date());
    }

    async loadMedicinesForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        const userEmail = this.getCurrentUserEmail();
        
        if (!userEmail) {
            this.showError('User not logged in');
            return;
        }

        try {
            const response = await fetch(`http://localhost:3001/api/medicines/${dateStr}?user_email=${encodeURIComponent(userEmail)}`);
            const result = await response.json();
            
            if (result.status === 'success') {
                this.displayDailyMedicines(result.data);
            } else {
                console.error('Failed to load medicines for date:', result);
                this.showError('Failed to load medicines for selected date');
            }
        } catch (error) {
            console.error('Error loading medicines for date:', error);
            this.showError('Cannot connect to server');
        }
    }

    displayDailyMedicines(medicines) {
        const dailyMedicines = document.getElementById('daily-medicines');
        if (!dailyMedicines) return;

        if (medicines.length === 0) {
            dailyMedicines.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-plus"></i>
                    <h4>No Medicines Scheduled</h4>
                    <p>No medicines scheduled for this date. Click on a calendar date to add medicines.</p>
                </div>
            `;
            return;
        }

        dailyMedicines.innerHTML = medicines.map(medicine => {
            const time = medicine.scheduled_time ? medicine.scheduled_time.substring(0, 5) : '09:00';
            const statusClass = medicine.status || 'scheduled';
            
            return `
                <div class="medicine-item ${statusClass}">
                    <div class="medicine-info">
                        <h4 class="medicine-name">${medicine.name}</h4>
                        <div class="medicine-details">
                            <span class="medicine-dosage">${medicine.dosage}</span>
                            <span class="medicine-time">${time}</span>
                        </div>
                    </div>
                    <div class="medicine-actions">
                        ${medicine.status === 'taken' ? 
                            `<div class="medicine-status taken">
                                <i class="fas fa-check-circle"></i> Taken
                            </div>` :
                            `<button class="btn btn-success" onclick="medicationTracker.markAsTaken('${medicine.id}')">
                                <i class="fas fa-check"></i> Mark as Taken
                            </button>`
                        }
                    </div>
                </div>
            `;
        }).join('');
    }

    async markAsTaken(medicineId) {
        const userEmail = this.getCurrentUserEmail();
        
        if (!userEmail) {
            this.showError('User not logged in');
            return;
        }

        try {
            const response = await fetch(`http://localhost:3001/api/medicines/${medicineId}/take`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_email: userEmail,
                    notes: 'Marked as taken from dashboard'
                })
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                this.showSuccess('Medicine marked as taken!');
                this.loadMedicinesForDate(this.selectedDate);
            } else {
                this.showError(result.message || 'Failed to mark medicine as taken');
            }
        } catch (error) {
            console.error('Error marking medicine as taken:', error);
            this.showError('Cannot connect to server');
        }
    }

    async addMedicine() {
        const form = document.getElementById('add-medicine-form');
        const formData = new FormData(form);
        const userEmail = this.getCurrentUserEmail();
        
        if (!userEmail) {
            this.showError('User not logged in');
            return;
        }

        const medicineData = {
            user_email: userEmail,
            medicine_name: formData.get('medicine_name'),
            dosage: formData.get('dosage'),
            scheduled_date: formData.get('scheduled_date'),
            scheduled_time: formData.get('scheduled_time')
        };

        if (!medicineData.medicine_name || !medicineData.dosage || !medicineData.scheduled_date) {
            this.showError('Please fill in all required fields');
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/api/medicines', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(medicineData)
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                this.showSuccess('Medicine added successfully!');
                this.closeMedicineModal();
                this.loadMedicinesForDate(this.selectedDate);
                this.loadMedicineStock(); // Refresh stock after adding medicine
                form.reset();
            } else {
                this.showError(result.message || 'Failed to add medicine');
            }
        } catch (error) {
            console.error('Error adding medicine:', error);
            this.showError('Cannot connect to server');
        }
    }

    getCurrentUserEmail() {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            const user = JSON.parse(currentUser);
            return user.email;
        }
        return null;
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.medication-message');
        existingMessages.forEach(msg => msg.remove());
        
        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `message medication-message ${type}`;
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        else if (type === 'error') icon = 'exclamation-circle';
        
        messageDiv.innerHTML = `
            <i class="fas fa-${icon}"></i>
            ${message}
        `;
        
        // Insert at top of medication tracker
        const container = document.querySelector('.medication-tracker-container');
        if (container) {
            container.insertBefore(messageDiv, container.firstChild);
        }
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Global functions for medication tracker
function openMedicineModal(date) {
    const modal = document.getElementById('add-medicine-modal');
    const selectedDateInput = document.getElementById('selected-date');
    
    if (modal && selectedDateInput) {
        const dateStr = date.toISOString().split('T')[0];
        selectedDateInput.value = dateStr;
        modal.classList.add('active');
    }
}

function closeMedicineModal() {
    const modal = document.getElementById('add-medicine-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Initialize medication tracker when dashboard loads
let medicationTracker = null;

// Update the existing showSection function to initialize medication tracker
const originalShowSection = window.showSection;
window.showSection = function(sectionName) {
    originalShowSection(sectionName);
    
    // Initialize medication tracker when medication-tracker section is shown
    if (sectionName === 'medication-tracker' && !medicationTracker) {
        setTimeout(() => {
            medicationTracker = new MedicationTracker();
        }, 100);
    }
};

// Add click event to calendar days to open modal
document.addEventListener('click', (e) => {
    if (e.target.closest('.calendar-day') && !e.target.closest('.calendar-day').classList.contains('other-month')) {
        const calendarDay = e.target.closest('.calendar-day');
        const dayNumber = calendarDay.querySelector('.day-number');
        if (dayNumber && medicationTracker) {
            const day = parseInt(dayNumber.textContent);
            const selectedDate = new Date(medicationTracker.currentDate.getFullYear(), medicationTracker.currentDate.getMonth(), day);
            openMedicineModal(selectedDate);
        }
    }
});

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('add-medicine-modal');
    if (modal && e.target === modal) {
        closeMedicineModal();
    }
});
