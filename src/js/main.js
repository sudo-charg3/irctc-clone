// Global variables
const API_URL = 'http://localhost:3000/api';
let authToken = localStorage.getItem('authToken');
let currentUser = null;
let registerLink; // Declare once at the top level

// Declare stations array at the top
let allStations = [];
let stationsLoaded = false;

// Helper Functions
function isLoggedIn() {
    return !!authToken;
}

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginBtn) {
        if (isLoggedIn()) {
            loginBtn.innerHTML = '<i class="fas fa-user"></i> My Account';
            loginBtn.onclick = () => window.location.href = 'profile.html';
        } else {
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
            loginBtn.onclick = () => {
                const loginModal = document.getElementById('loginModal');
                if (loginModal) loginModal.classList.remove('hidden');
            };
        }
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Remove the registerLink event listener from here
    // It's now handled in setupEventListeners
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.classList.add('fade-out');
        setTimeout(() => errorDiv.remove(), 500);
    }, 3000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.classList.add('fade-out');
        setTimeout(() => successDiv.remove(), 500);
    }, 3000);
}

// Add this function definition near the top with your other functions
function showRegisterForm(e) {
    if (e) e.preventDefault();
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (!registerForm) {
        // Create the register form if it doesn't exist
        createRegisterForm();
    }
    
    if (loginForm && registerForm) {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    }
}

// Add this helper function to create the registration form
function createRegisterForm() {
    const modalContent = document.querySelector('.modal-content');
    if (!modalContent) return;
    
    const registerForm = document.createElement('form');
    registerForm.id = 'registerForm';
    registerForm.className = 'hidden';
    registerForm.innerHTML = `
        <div class="form-group">
            <input type="text" id="reg-username" placeholder="Username" required>
        </div>
        <div class="form-group">
            <input type="email" id="reg-email" placeholder="Email" required>
        </div>
        <div class="form-group">
            <input type="password" id="reg-password" placeholder="Password" required>
        </div>
        <div class="form-group">
            <input type="password" id="reg-confirm-password" placeholder="Confirm Password" required>
        </div>
        <button type="submit">Register</button>
        <p>Already have an account? <a href="#" id="loginLink">Login</a></p>
    `;
    
    modalContent.appendChild(registerForm);
    
    // Add event listener for register form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;
        
        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }
        
        const success = await register(username, email, password);
        if (success) {
            showSuccess('Registration successful! Please login.');
            document.getElementById('registerForm').classList.add('hidden');
            document.getElementById('loginForm').classList.remove('hidden');
        }
    });
    
    // Add event listener for login link to switch back
    const loginLink = registerForm.querySelector('#loginLink');
    if (loginLink) {
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('registerForm').classList.add('hidden');
            document.getElementById('loginForm').classList.remove('hidden');
        });
    }
}

// Auth Functions
async function login(username, password) {
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            await fetchUserProfile();
            return true;
        } else {
            throw new Error(data.error || 'Login failed');
        }
    } catch (error) {
        showError(error.message);
        return false;
    }
}

async function register(username, email, password) {
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            return true;
        } else {
            throw new Error(data.error || 'Registration failed');
        }
    } catch (error) {
        showError(error.message);
        return false;
    }
}

function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    window.location.href = 'home.html';
}

// Redirect if not logged in - add this function
function requireAuth() {
    if (!isLoggedIn()) {
        window.location.href = 'home.html?authRequired=true';
        return false;
    }
    return true;
}

// Replace the existing fetchUserProfile function with this enhanced version
async function fetchUserProfile() {
    if (!isLoggedIn()) return;
    
    try {
        console.log('Fetching user profile...');
        const response = await fetch(`${API_URL}/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const user = await response.json();
            console.log('User profile loaded:', user);
            
            // Update UI with user data
            document.getElementById('user-name').textContent = user.username;
            document.getElementById('user-email').textContent = user.email;
            
            // If we're on the profile page, fetch bookings too
            if (window.location.pathname.includes('profile.html')) {
                fetchUserBookings();
                setupProfileTabs();
            }
            
            return user;
        } else {
            const errorData = await response.json();
            console.error('Error fetching profile:', errorData);
            showError(errorData.error || 'Failed to load profile');
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        showError('Could not connect to server');
    }
}

// Update or add the fetchUserBookings function
async function fetchUserBookings() {
    if (!isLoggedIn()) return;
    
    try {
        console.log('Fetching user bookings...');
        const response = await fetch(`${API_URL}/bookings`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const bookings = await response.json();
            console.log('User bookings loaded:', bookings);
            
            // Update the bookings list in the UI
            const bookingsList = document.getElementById('bookings-list');
            if (!bookingsList) return;
            
            if (bookings.length === 0) {
                bookingsList.innerHTML = `
                    <div class="no-bookings">
                        <i class="fas fa-ticket-alt fa-3x"></i>
                        <p>You don't have any bookings yet.</p>
                        <a href="train_search.html" class="search-link">Search for trains</a>
                    </div>
                `;
                return;
            }
            
            // Display the bookings
            bookingsList.innerHTML = '';
            bookings.forEach(booking => {
                const bookingCard = document.createElement('div');
                bookingCard.className = 'booking-card';
                
                // Format date for display
                const journeyDate = new Date(booking.journey_date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                
                // Create status badge with appropriate color
                const statusClass = booking.status === 'CONFIRMED' ? 'status-confirmed' : 
                                   booking.status === 'PENDING' ? 'status-pending' : 'status-cancelled';
                
                bookingCard.innerHTML = `
                    <div class="booking-header">
                        <div class="booking-train">
                            <h3>${booking.train_name} (${booking.train_number})</h3>
                            <p>${booking.source_station} → ${booking.destination_station}</p>
                        </div>
                        <div class="booking-status ${statusClass}">
                            ${booking.status}
                        </div>
                    </div>
                    <div class="booking-details">
                        <div class="booking-info">
                            <p><i class="fas fa-calendar"></i> ${journeyDate}</p>
                            <p><i class="fas fa-clock"></i> ${booking.departure_time} → ${booking.arrival_time}</p>
                            <p><i class="fas fa-ticket-alt"></i> ${booking.class_type} - ₹${booking.price}</p>
                        </div>
                        <div class="booking-actions">
                            <button class="view-ticket-btn" data-booking-id="${booking.booking_id}">
                                <i class="fas fa-eye"></i> View Ticket
                            </button>
                            ${booking.status === 'CONFIRMED' ? `
                                <button class="cancel-btn" data-booking-id="${booking.booking_id}">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
                
                bookingsList.appendChild(bookingCard);
                
                // Add event listeners for the buttons
                const viewBtn = bookingCard.querySelector('.view-ticket-btn');
                if (viewBtn) {
                    viewBtn.addEventListener('click', () => {
                        // Navigate to ticket page
                        window.location.href = `ticket.html?bookingId=${booking.booking_id}`;
                    });
                }
                
                const cancelBtn = bookingCard.querySelector('.cancel-btn');
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', async () => {
                        if (confirm('Are you sure you want to cancel this booking?')) {
                            try {
                                // Send cancellation request to server (you'll need to implement this API endpoint)
                                const response = await fetch(`${API_URL}/bookings/${booking.booking_id}/cancel`, {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${authToken}`
                                    }
                                });
                                
                                if (response.ok) {
                                    showSuccess('Booking cancelled successfully');
                                    fetchUserBookings(); // Refresh the bookings list
                                } else {
                                    const error = await response.json();
                                    showError(error.message || 'Failed to cancel booking');
                                }
                            } catch (error) {
                                showError('Could not connect to server');
                            }
                        }
                    });
                }
            });
        } else {
            const errorData = await response.json();
            console.error('Error fetching bookings:', errorData);
            showError(errorData.error || 'Failed to load bookings');
        }
    } catch (error) {
        console.error('Error fetching bookings:', error);
        showError('Could not connect to server');
    }
}

// Add a function to fetch bookings
async function fetchUserBookings() {
    try {
        const response = await fetch(`${API_URL}/bookings`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const bookings = await response.json();
            const bookingsList = document.getElementById('bookings-list');
            
            if (bookingsList) {
                if (bookings.length === 0) {
                    bookingsList.innerHTML = '<p>You have no bookings yet.</p>';
                    return;
                }
                
                bookingsList.innerHTML = '';
                bookings.forEach(booking => {
                    const bookingCard = document.createElement('div');
                    bookingCard.className = 'booking-card';
                    
                    const journeyDate = new Date(booking.journey_date).toLocaleDateString();
                    
                    bookingCard.innerHTML = `
                        <div class="booking-header">
                            <h3>${booking.train_name} (${booking.train_number})</h3>
                            <span class="booking-status ${booking.status.toLowerCase()}">${booking.status}</span>
                        </div>
                        <div class="booking-details">
                            <div class="journey-info">
                                <p><strong>From:</strong> ${booking.source_station}</p>
                                <p><strong>To:</strong> ${booking.destination_station}</p>
                                <p><strong>Date:</strong> ${journeyDate}</p>
                                <p><strong>Class:</strong> ${getClassName(booking.class_type)}</p>
                            </div>
                            <div class="booking-actions">
                                <button class="view-ticket-btn" data-booking-id="${booking.booking_id}">View Ticket</button>
                            </div>
                        </div>
                    `;
                    
                    bookingsList.appendChild(bookingCard);
                    
                    // Add click handler for view ticket button
                    const viewBtn = bookingCard.querySelector('.view-ticket-btn');
                    viewBtn.addEventListener('click', () => {
                        window.location.href = `booking_details.html?id=${booking.booking_id}`;
                    });
                });
            }
        }
    } catch (error) {
        console.error('Error fetching bookings:', error);
    }
}

// Train Search Functions
async function searchTrains(from, to, date, classType) {
    try {
        console.log(`Searching trains: From=${from}, To=${to}, Date=${date}, Class=${classType}`);
        
        const response = await fetch(`${API_URL}/search-trains`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ from, to, date, classType })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("API error:", errorText);
            throw new Error(`Failed to search trains: ${response.status} ${response.statusText}`);
        }
        
        const trains = await response.json();
        console.log("API returned trains:", trains);
        return trains;
    } catch (error) {
        console.error("Error in searchTrains:", error);
        showError(error.message);
        return [];
    }
}

// Replace the displayTrains function

function displayTrains(trains) {
    console.log("Displaying trains:", trains);
    const trainsList = document.getElementById('trains-list');
    const noTrains = document.getElementById('no-trains');
    const resultsSection = document.getElementById('results-section');
    
    if (!trainsList || !resultsSection) {
        console.error("Missing UI elements for train display");
        return;
    }
    
    trainsList.innerHTML = '';
    resultsSection.classList.remove('hidden');
    
    if (trains.length === 0) {
        if (noTrains) {
            noTrains.classList.remove('hidden');
            trainsList.classList.add('hidden');
        }
        return;
    }
    
    if (noTrains) {
        noTrains.classList.add('hidden');
        trainsList.classList.remove('hidden');
    }
    
    trains.forEach(train => {
        const trainCard = document.createElement('div');
        trainCard.className = 'train-card';
        
        // Format source and destination with station codes
        const sourceDisplay = train.source_code ? 
            `${train.source_station} (${train.source_code})` : train.source_station;
        
        const destDisplay = train.destination_code ? 
            `${train.destination_station} (${train.destination_code})` : train.destination_station;
        
        trainCard.innerHTML = `
            <div class="train-info">
                <div class="train-primary">
                    <h3>${train.train_name}</h3>
                    <span class="train-number">${train.train_number}</span>
                </div>
                <div class="train-schedule">
                    <div class="departure">
                        <h4>${train.departure_time}</h4>
                        <p>${sourceDisplay}</p>
                    </div>
                    <div class="duration">
                        <span class="line"></span>
                        <p>Duration</p>
                    </div>
                    <div class="arrival">
                        <h4>${train.arrival_time}</h4>
                        <p>${destDisplay}</p>
                    </div>
                </div>
            </div>
            <div class="train-booking">
                <div class="availability">
                    <p class="class-type">${train.class_type}</p>
                    <p class="seats-available">${train.available_seats} seats available</p>
                    <p class="price">₹${train.price}</p>
                </div>
                <button class="book-btn" data-train-id="${train.train_id}" data-class="${train.class_type}">Book Now</button>
            </div>
        `;
        
        trainsList.appendChild(trainCard);
        
        // Add event listener to the book button
        const bookBtn = trainCard.querySelector('.book-btn');
        bookBtn.addEventListener('click', () => {
            const trainId = bookBtn.dataset.trainId;
            const classType = bookBtn.dataset.class;
            
            // Redirect to train details page with query params
            window.location.href = `train_details.html?trainId=${trainId}&class=${classType}`;
        });
    });
}

// Booking Functions
async function bookTicket(trainId, seatId, journeyDate, passengers) {
    if (!isLoggedIn()) {
        showError('Please login to book tickets');
        return false;
    }
    
    try {
        const response = await fetch(`${API_URL}/book-ticket`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                trainId,
                seatId,
                journeyDate,
                passengers
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            return {
                success: true,
                bookingId: data.bookingId
            };
        } else {
            throw new Error(data.error || 'Booking failed');
        }
    } catch (error) {
        showError(error.message);
        return {
            success: false
        };
    }
}

// Payment Functions
async function processPayment(bookingId, paymentDetails) {
    try {
        const response = await fetch(`${API_URL}/process-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                bookingId,
                paymentDetails
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            return {
                success: true,
                transactionId: data.transactionId
            };
        } else {
            throw new Error(data.error || 'Payment failed');
        }
    } catch (error) {
        showError(error.message);
        return {
            success: false
        };
    }
}

// Event Handlers
function setupEventListeners() {
    // Login Modal
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const closeBtn = document.querySelector('.modal-content .close');
    
    if (loginBtn && loginModal) {
        loginBtn.addEventListener('click', () => {
            if (!isLoggedIn()) {
                loginModal.classList.remove('hidden');
            } else {
                window.location.href = 'profile.html';
            }
        });
    }
    
    if (closeBtn && loginModal) {
        closeBtn.addEventListener('click', () => {
            loginModal.classList.add('hidden');
        });
    }
    
    // Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            const success = await login(username, password);
            if (success) {
                loginModal.classList.add('hidden');
                showSuccess('Login successful!');
                updateAuthUI();
            }
        });
    }
    
    // Register Link - SIMPLIFIED to avoid duplications
    const registerLink = document.getElementById('registerLink');
    if (registerLink) {
        registerLink.addEventListener('click', showRegisterForm);
    }
    
    // Create the register form if needed
    if (loginModal && !document.getElementById('registerForm')) {
        createRegisterForm();
    }
    
    // Quick Search Form (Home Page)
    const quickSearchForm = document.getElementById('quick-search-form');
    if (quickSearchForm) {
        quickSearchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const from = document.getElementById('from').value;
            const to = document.getElementById('to').value;
            const date = document.getElementById('date').value;
            
            window.location.href = `train_search.html?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`;
        });
    }
    
    // Train Search Form
    const trainSearchForm = document.getElementById('train-search-form');
    if (trainSearchForm) {
        trainSearchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const from = document.getElementById('from').value;
            const to = document.getElementById('to').value;
            const date = document.getElementById('date').value;
            const classType = document.getElementById('class-type').value;
            
            const trains = await searchTrains(from, to, date, classType);
            displayTrains(trains);
        });
    }
    
    // Profile Tabs
    const tabLinks = document.querySelectorAll('.profile-menu a');
    if (tabLinks.length > 0) {
        tabLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Hide all tabs
                document.querySelectorAll('.profile-tab').forEach(tab => {
                    tab.classList.remove('active');
                });
                
                // Deactivate all links
                tabLinks.forEach(tabLink => {
                    tabLink.classList.remove('active');
                });
                
                // Show selected tab
                const tabId = link.dataset.tab;
                document.getElementById(tabId).classList.add('active');
                
                // Activate clicked link
                link.classList.add('active');
            });
        });
    }
    
    // Payment Method Selection
    const paymentMethods = document.querySelectorAll('input[name="payment-method"]');
    if (paymentMethods.length > 0) {
        paymentMethods.forEach(method => {
            method.addEventListener('change', () => {
                const cardPayment = document.getElementById('card-payment');
                const upiPayment = document.getElementById('upi-payment');
                
                if (method.value === 'upi') {
                    cardPayment.classList.add('hidden');
                    upiPayment.classList.remove('hidden');
                } else {
                    cardPayment.classList.remove('hidden');
                    upiPayment.classList.add('hidden');
                }
            });
        });
    }
    
    // Payment Form
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get booking ID from URL
            const urlParams = new URLSearchParams(window.location.search);
            const bookingId = urlParams.get('bookingId');
            
            if (!bookingId) {
                showError('Invalid booking');
                return;
            }
            
            const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
            let paymentDetails = {};
            
            if (paymentMethod === 'upi') {
                paymentDetails = {
                    method: 'upi',
                    upiId: document.getElementById('upi-id').value
                };
            } else {
                paymentDetails = {
                    method: paymentMethod,
                    cardNumber: document.getElementById('card-number').value,
                    expiryDate: document.getElementById('expiry-date').value,
                    cvv: document.getElementById('cvv').value,
                    cardName: document.getElementById('card-name').value
                };
            }
            
            // Show processing UI
            const payBtn = paymentForm.querySelector('.pay-btn');
            const originalText = payBtn.textContent;
            payBtn.disabled = true;
            payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            
            // Process payment
            setTimeout(async () => {
                // This is a dummy payment - in a real app, call processPayment()
                // const result = await processPayment(bookingId, paymentDetails);
                
                // Simulate success
                const result = { success: true, transactionId: 'TX' + Math.random().toString(36).substr(2, 9) };
                
                if (result.success) {
                    showSuccess('Payment successful! Redirecting to ticket...');
                    setTimeout(() => {
                        window.location.href = `booking_confirmation.html?bookingId=${bookingId}`;
                    }, 2000);
                } else {
                    payBtn.disabled = false;
                    payBtn.textContent = originalText;
                }
            }, 2000);
        });
    }
    
    // Add this code to update the login modal with registration form toggle
    registerLink = document.getElementById('registerLink');
    if (registerLink) {
        // Replace the existing form with forms that can toggle
        const modalContent = registerLink.closest('.modal-content');
        if (modalContent) {
            // Add a register form if it doesn't exist
            if (!document.getElementById('registerForm')) {
                const registerForm = document.createElement('form');
                registerForm.id = 'registerForm';
                registerForm.className = 'hidden';
                registerForm.innerHTML = `
                    <div class="form-group">
                        <input type="text" id="reg-username" placeholder="Username" required>
                    </div>
                    <div class="form-group">
                        <input type="email" id="reg-email" placeholder="Email" required>
                    </div>
                    <div class="form-group">
                        <input type="password" id="reg-password" placeholder="Password" required>
                    </div>
                    <div class="form-group">
                        <input type="password" id="reg-confirm-password" placeholder="Confirm Password" required>
                    </div>
                    <button type="submit">Register</button>
                    <p>Already have an account? <a href="#" id="loginLink">Login</a></p>
                `;
                
                modalContent.appendChild(registerForm);
                
                // Add event listener for register form
                registerForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const username = document.getElementById('reg-username').value;
                    const email = document.getElementById('reg-email').value;
                    const password = document.getElementById('reg-password').value;
                    const confirmPassword = document.getElementById('reg-confirm-password').value;
                    
                    if (password !== confirmPassword) {
                        showError('Passwords do not match');
                        return;
                    }
                    
                    const success = await register(username, email, password);
                    if (success) {
                        showSuccess('Registration successful! Please login.');
                        document.getElementById('registerForm').classList.add('hidden');
                        document.getElementById('loginForm').classList.remove('hidden');
                    }
                });
                
                // Add event listener for login link
                const loginLink = registerForm.querySelector('#loginLink');
                loginLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.getElementById('registerForm').classList.add('hidden');
                    document.getElementById('loginForm').classList.remove('hidden');
                });
            }
        }
        
        // Add event listener for register link
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('registerForm').classList.remove('hidden');
        });
    }
    
    // Setup station autocomplete if on search page
    setupStationAutocomplete();
}

// Train Details Page
async function loadTrainDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const trainId = urlParams.get('trainId');
    const classType = urlParams.get('class');
    
    if (!trainId) return;
    
    try {
        const response = await fetch(`${API_URL}/train/${trainId}`);
        if (!response.ok) {
            throw new Error(`Failed to load train details: ${response.status}`);
        }
        
        const train = await response.json();
        
        // Update train header
        document.getElementById('train-name').textContent = train.train_name;
        document.getElementById('train-number').textContent = train.train_number;
        document.getElementById('train-route').textContent = `${train.source_station} - ${train.destination_station}`;
        
        // Update journey details
        document.getElementById('source-station').textContent = train.source_station;
        document.getElementById('destination-station').textContent = train.destination_station;
        document.getElementById('departure-time').textContent = train.departure_time;
        document.getElementById('arrival-time').textContent = train.arrival_time;
        
        // Calculate and display duration
        const dep = train.departure_time.includes(':') ? train.departure_time : '00:00';
        const arr = train.arrival_time.includes(':') ? train.arrival_time : '00:00';
        
        const [depHours, depMinutes] = dep.split(':').map(Number);
        const [arrHours, arrMinutes] = arr.split(':').map(Number);
        
        let durationHours = arrHours - depHours;
        let durationMinutes = arrMinutes - depMinutes;
        
        if (durationMinutes < 0) {
            durationMinutes += 60;
            durationHours -= 1;
        }
        
        if (durationHours < 0) {
            durationHours += 24; // Overnight journey
        }
        
        const duration = `${durationHours}h ${durationMinutes}m`;
        document.getElementById('journey-duration').textContent = duration;
        
        // Show available classes
        const classOptions = document.getElementById('class-options');
        classOptions.innerHTML = '';
        
        if (!train.classes || train.classes.length === 0) {
            classOptions.innerHTML = '<p>No class information available</p>';
            return;
        }
        
        train.classes.forEach(cls => {
            const classCard = document.createElement('div');
            classCard.className = `class-card ${cls.class_type === classType ? 'selected' : ''}`;
            classCard.dataset.classType = cls.class_type;
            classCard.dataset.seatId = cls.seat_id || '';
            classCard.dataset.price = cls.price || 0;
            
            classCard.innerHTML = `
                <div class="class-name">${getClassName(cls.class_type)}</div>
                <div class="class-details">
                    <p>Available: ${cls.available_seats}</p>
                    <p class="price">₹${cls.price}</p>
                </div>
            `;
            
            classOptions.appendChild(classCard);
            
            // Add event listener for class selection
            classCard.addEventListener('click', () => {
                // Remove selected class from all cards
                document.querySelectorAll('.class-card').forEach(card => {
                    card.classList.remove('selected');
                });
                
                // Add selected class to this card
                classCard.classList.add('selected');
                
                // Update hidden input with selected class
                document.getElementById('selected-class').value = cls.class_type;
                document.getElementById('selected-train-id').value = trainId;
            });
        });
        
        // Set default selected class if provided in URL
        if (classType) {
            document.getElementById('selected-class').value = classType;
            
            // Also set default date to today + 1 day
            const journeyDateInput = document.getElementById('journey-date');
            if (journeyDateInput) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                journeyDateInput.valueAsDate = tomorrow;
                journeyDateInput.min = new Date().toISOString().split('T')[0]; // Set min to today
            }
        }
        
    } catch (error) {
        showError(`Failed to load train details: ${error.message}`);
        console.error('Train details error:', error);
    }
}

// Setup booking form submission
function setupBookingForm() {
    const bookingForm = document.getElementById('booking-form');
    if (!bookingForm) return;
    
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!isLoggedIn()) {
            showError('Please login to book tickets');
            const loginModal = document.getElementById('loginModal');
            if (loginModal) loginModal.classList.remove('hidden');
            return;
        }
        
        const trainId = document.getElementById('selected-train-id').value;
        const classType = document.getElementById('selected-class').value;
        const journeyDate = document.getElementById('journey-date').value;
        
        if (!trainId || !classType) {
            showError('Please select a class type for your journey');
            return;
        }
        
        if (!journeyDate) {
            showError('Please select a journey date');
            return;
        }
        
        // Get all passengers
        const passengerNames = Array.from(document.getElementsByName('name[]')).map(input => input.value);
        const passengerAges = Array.from(document.getElementsByName('age[]')).map(input => input.value);
        const passengerGenders = Array.from(document.getElementsByName('gender[]')).map(input => input.value);
        
        if (passengerNames.length === 0 || passengerNames.some(name => !name)) {
            showError('Please enter passenger details');
            return;
        }
        
        // Collect passenger data
        const passengers = passengerNames.map((name, index) => ({
            name,
            age: passengerAges[index],
            gender: passengerGenders[index]
        }));
        
        // Get contact info
        const email = document.getElementById('contact-email').value;
        const phone = document.getElementById('contact-phone').value;
        
        // Save booking data to sessionStorage for payment page
        const bookingData = {
            trainId,
            classType,
            journeyDate,
            passengers,
            contactInfo: { email, phone },
            // Get these from the page
            trainName: document.getElementById('train-name').textContent,
            trainNumber: document.getElementById('train-number').textContent,
            sourceStation: document.getElementById('source-station').textContent,
            destStation: document.getElementById('destination-station').textContent,
            departureTime: document.getElementById('departure-time').textContent,
            arrivalTime: document.getElementById('arrival-time').textContent,
            price: document.querySelector(`.class-card.selected .price`).textContent
        };
        
        sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
        
        // Create dummy booking ID
        const bookingId = 'BK' + Date.now().toString().substr(-8);
        
        // Redirect to payment page
        window.location.href = `payment.html?bookingId=${bookingId}`;
    });
}

// Helper to get full class name
function getClassName(classCode) {
    const classNames = {
        '1A': 'First AC',
        '2A': 'Second AC',
        '3A': 'Third AC',
        'SL': 'Sleeper',
        'CC': 'Chair Car',
        'EC': 'Executive Chair Car'
    };
    return classNames[classCode] || classCode;
}

// Updated passenger management functions
function setupAddPassenger() {
    const addBtn = document.getElementById('add-passenger');
    const passengersList = document.getElementById('passengers-list');
    
    if (!addBtn || !passengersList) return;
    
    addBtn.addEventListener('click', () => {
        const newPassenger = document.createElement('div');
        newPassenger.className = 'passenger';
        newPassenger.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <input type="text" placeholder="Passenger Name" name="name[]" required>
                </div>
                <div class="form-group">
                    <input type="number" placeholder="Age" name="age[]" min="1" max="120" required>
                </div>
                <div class="form-group">
                    <select name="gender[]" required>
                        <option value="">Select Gender</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="O">Other</option>
                    </select>
                </div>
                <button type="button" class="remove-btn"><i class="fas fa-times"></i></button>
            </div>
        `;
        
        passengersList.appendChild(newPassenger);
        
        // Add event listener to remove button
        const removeBtn = newPassenger.querySelector('.remove-btn');
        removeBtn.addEventListener('click', () => {
            passengersList.removeChild(newPassenger);
        });
    });
}

// Payment Page
function loadPaymentDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('bookingId');
    
    if (!bookingId) {
        showError('Invalid booking reference');
        return;
    }
    
    // Get booking data from session storage
    const bookingDataStr = sessionStorage.getItem('bookingData');
    if (!bookingDataStr) {
        showError('Booking data not found');
        return;
    }
    
    try {
        const booking = JSON.parse(bookingDataStr);
        booking.bookingId = bookingId;
        
        console.log("Retrieved booking data:", booking);
        
        // Update UI with booking details
        document.getElementById('summary-train-name').textContent = booking.trainName;
        document.getElementById('summary-train-number').textContent = booking.trainNumber;
        document.getElementById('summary-source').textContent = booking.sourceStation;
        document.getElementById('summary-destination').textContent = booking.destStation;
        document.getElementById('summary-date').textContent = booking.journeyDate;
        document.getElementById('summary-class').textContent = getClassName(booking.classType);
        
        // Update passengers list
        const passengersList = document.getElementById('passengers-summary');
        if (passengersList) {
            passengersList.innerHTML = '';
            booking.passengers.forEach(passenger => {
                const li = document.createElement('li');
                li.textContent = `${passenger.name} (${passenger.age}, ${passenger.gender})`;
                passengersList.appendChild(li);
            });
        }
        
        // Calculate fare
        const basePrice = parseInt(booking.price.replace('₹', ''));
        const totalPassengers = booking.passengers.length;
        const baseFare = basePrice * totalPassengers;
        const reservationCharge = 60 * totalPassengers;
        const gst = Math.round(baseFare * 0.05);
        const totalFare = baseFare + reservationCharge + gst;
        
        // Update fare details
        document.getElementById('base-fare').textContent = `₹${baseFare}`;
        document.getElementById('reservation-charge').textContent = `₹${reservationCharge}`;
        document.getElementById('gst').textContent = `₹${gst}`;
        document.getElementById('total-fare').textContent = `₹${totalFare}`;
        document.getElementById('pay-amount').textContent = totalFare;
        
        // Store calculation for payment processing
        sessionStorage.setItem('fareDetails', JSON.stringify({
            baseFare,
            reservationCharge,
            gst,
            totalFare
        }));
        
    } catch (error) {
        console.error('Error loading payment details:', error);
        showError('Failed to load booking details');
    }
}

// Station autocomplete functionality

// Improved fetchStations function
async function fetchStations() {
    if (stationsLoaded) return; // Only fetch once
    
    try {
        console.log("Fetching stations from API...");
        const response = await fetch(`${API_URL}/stations`);
        
        if (!response.ok) {
            throw new Error(`Failed to load stations: ${response.status}`);
        }
        
        const data = await response.json();
        allStations = data;
        stationsLoaded = true;
        console.log(`Successfully loaded ${allStations.length} stations`);
        
        // Debug: Display first few stations
        if (allStations.length > 0) {
            console.log("Sample stations:", allStations.slice(0, 3));
        }
        
        return true;
    } catch (error) {
        console.error('Error fetching stations:', error);
        return false;
    }
}

// Enhanced showSuggestions function with more robust display logic
function showSuggestions(value, suggestionsElement, inputElement) {
    if (!suggestionsElement) {
        console.error("Suggestions element not found");
        return;
    }
    
    // Clear previous suggestions
    suggestionsElement.innerHTML = '';
    
    if (!value || value.length < 1) {
        suggestionsElement.style.display = 'none';
        return;
    }
    
    // Ensure we have stations data
    if (!allStations || allStations.length === 0) {
        console.warn("No stations data available for suggestions");
        fetchStations().then(() => {
            if (allStations.length > 0) {
                // Try again with data
                showSuggestions(value, suggestionsElement, inputElement);
            }
        });
        return;
    }
    
    const searchTerm = value.toLowerCase();
    console.log(`Finding suggestions for: "${searchTerm}"`);
    
    // Filter stations with more comprehensive match logic
    const filteredStations = allStations.filter(station => {
        const nameMatch = station.station_name && station.station_name.toLowerCase().includes(searchTerm);
        const codeMatch = station.station_code && station.station_code.toLowerCase().includes(searchTerm);
        const cityMatch = station.city && station.city.toLowerCase().includes(searchTerm);
        
        return nameMatch || codeMatch || cityMatch;
    }).slice(0, 8); // Limit to 8 results
    
    console.log(`Found ${filteredStations.length} matching stations`);
    
    if (filteredStations.length === 0) {
        suggestionsElement.style.display = 'none';
        return;
    }
    
    // Create and display suggestion items
    filteredStations.forEach(station => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = `${station.station_name} (${station.station_code}), ${station.city}`;
        
        item.addEventListener('click', () => {
            inputElement.value = station.station_code; // Use station code for searching
            inputElement.dataset.stationId = station.station_id;
            inputElement.dataset.stationName = station.station_name;
            suggestionsElement.style.display = 'none';
            
            // Highlight the next input if available
            if (inputElement.id === 'from') {
                const toInput = document.getElementById('to');
                if (toInput) toInput.focus();
            }
        });
        
        suggestionsElement.appendChild(item);
    });
    
    // Force display block and check if it worked
    suggestionsElement.style.display = 'block';
    console.log("Suggestions display:", suggestionsElement.style.display);
    
    // Add debugging outline to see if element is visible
    suggestionsElement.style.border = '2px solid red';
    
    // Check if element is actually visible in DOM
    setTimeout(() => {
        const isVisible = suggestionsElement.offsetParent !== null;
        console.log("Is suggestions dropdown visible:", isVisible);
        if (!isVisible) {
            // Try to force visibility with !important
            suggestionsElement.setAttribute('style', 'display: block !important; border: 2px solid red !important; z-index: 9999 !important;');
        }
    }, 100);
}

// Improved setupStationAutocomplete with immediate execution
function setupStationAutocomplete() {
    console.log("Setting up station autocomplete...");
    
    const fromInput = document.getElementById('from');
    const toInput = document.getElementById('to');
    const fromSuggestions = document.getElementById('from-suggestions');
    const toSuggestions = document.getElementById('to-suggestions');
    
    // Debug elements
    console.log("From input:", fromInput);
    console.log("To input:", toInput);
    console.log("From suggestions:", fromSuggestions);
    console.log("To suggestions:", toSuggestions);
    
    if (!fromInput || !toInput || !fromSuggestions || !toSuggestions) {
        console.error("Required input elements not found");
        return;
    }
    
    // Immediate fetch stations
    fetchStations();
    
    // Setup from input autocomplete
    fromInput.addEventListener('input', function() {
        console.log("From input changed:", this.value);
        showSuggestions(this.value, fromSuggestions, this);
    });
    
    // Add focus event listener
    fromInput.addEventListener('focus', function() {
        if (this.value.length > 0) {
            showSuggestions(this.value, fromSuggestions, this);
        }
    });
    
    // Setup to input autocomplete
    toInput.addEventListener('input', function() {
        console.log("To input changed:", this.value);
        showSuggestions(this.value, toSuggestions, this);
    });
    
    // Add focus event listener
    toInput.addEventListener('focus', function() {
        if (this.value.length > 0) {
            showSuggestions(this.value, toSuggestions, this);
        }
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        // Only hide if click is outside the autocomplete elements
        if (!fromInput.contains(e.target) && !fromSuggestions.contains(e.target)) {
            fromSuggestions.style.display = 'none';
        }
        
        if (!toInput.contains(e.target) && !toSuggestions.contains(e.target)) {
            toSuggestions.style.display = 'none';
        }
    });
    
    // Add swap functionality
    const swapIcon = document.querySelector('.swap-icon');
    if (swapIcon) {
        swapIcon.addEventListener('click', () => {
            // Swap values
            const fromValue = fromInput.value;
            const fromId = fromInput.dataset.stationId;
            const fromName = fromInput.dataset.stationName;
            
            fromInput.value = toInput.value;
            fromInput.dataset.stationId = toInput.dataset.stationId;
            fromInput.dataset.stationName = toInput.dataset.stationName;
            
            toInput.value = fromValue;
            toInput.dataset.stationId = fromId;
            toInput.dataset.stationName = fromName;
        });
    }
    
    console.log("Station autocomplete setup complete");
}

// Call this function immediately after definition
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded");
    
    // Get current page
    const currentPage = window.location.pathname.split('/').pop() || 'home.html';
    console.log("Current page:", currentPage);
    
    // Set default date on the search page
    if (currentPage === 'train_search.html') {
        const dateInput = document.getElementById('date');
        if (dateInput) {
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];
            dateInput.value = formattedDate;
            dateInput.min = formattedDate;
        }
        
        // Setup autocomplete immediately
        setupStationAutocomplete();
        
        // Also fetch stations right away
        fetchStations();
    }
    
    // Rest of your DOMContentLoaded code...
});

// Page Load Init
document.addEventListener('DOMContentLoaded', () => {
    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const authRequired = urlParams.get('authRequired');
    
    if (authRequired) {
        showError('Please login to access that page');
        // Auto-open login modal
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.classList.remove('hidden');
        }
    }
    
    // Check if user is logged in
    updateAuthUI();
    
    // Setup event listeners
    setupEventListeners();
    
    // Init functions based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'home.html';
    
    if (currentPage === 'profile.html') {
        // Redirect if not logged in
        if (!requireAuth()) return;
        
        fetchUserProfile();
    } else if (currentPage === 'train_details.html') {
        loadTrainDetails();
        setupAddPassenger();
        setupBookingForm();
    } else if (currentPage === 'payment.html') {
        // Redirect if not logged in
        if (!requireAuth()) return;
        
        loadPaymentDetails();
        setupPaymentMethodToggle();
        setupPaymentForm(); // Add this new function call
    } else if (currentPage === 'train_search.html') {
        // Set default date
        setDefaultDate();
        
        // Setup autocomplete
        setupStationAutocomplete();
        
        // Check for URL parameters for search
        const from = urlParams.get('from');
        const to = urlParams.get('to');
        const date = urlParams.get('date');
        
        if (from && to && date) {
            // Pre-fill search form
            document.getElementById('from').value = from;
            document.getElementById('to').value = to;
            document.getElementById('date').value = date;
            
            // Auto-search if form has been pre-filled
            const trainSearchForm = document.getElementById('train-search-form');
            if (trainSearchForm) {
                trainSearchForm.dispatchEvent(new Event('submit'));
            }
        }
    }
});

// Add this to your existing document ready handler in main.js

document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    
    const currentPage = window.location.pathname.split('/').pop() || 'home.html';
    
    if (currentPage === 'train_details.html') {
        loadTrainDetails();
        setupAddPassenger();
        setupBookingForm();
    } else if (currentPage === 'payment.html') {
        loadPaymentDetails();
        setupPaymentMethodToggle();
    } 
    
    // ...existing code...
});

// Add payment method toggle
function setupPaymentMethodToggle() {
    const paymentMethods = document.querySelectorAll('input[name="payment-method"]');
    const cardPayment = document.getElementById('card-payment');
    const upiPayment = document.getElementById('upi-payment');
    
    if (!paymentMethods.length || !cardPayment || !upiPayment) return;
    
    paymentMethods.forEach(method => {
        method.addEventListener('change', () => {
            if (method.value === 'upi') {
                cardPayment.classList.add('hidden');
                upiPayment.classList.remove('hidden');
            } else {
                cardPayment.classList.remove('hidden');
                upiPayment.classList.add('hidden');
            }
        });
    });
}

// Add this to your document ready function
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    
    if (currentPage === 'payment.html') {
        loadPaymentDetails();
        setupPaymentMethodToggle();
    }
    
    // ...existing code...
});

// Add this function to handle payment form submission
function setupPaymentForm() {
    const paymentForm = document.getElementById('payment-form');
    
    if (!paymentForm) return;
    
    paymentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get booking ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const bookingId = urlParams.get('bookingId');
        
        if (!bookingId) {
            showError('Invalid booking reference');
            return;
        }
        
        // Get booking and fare data from session storage
        const bookingDataStr = sessionStorage.getItem('bookingData');
        const fareDetailsStr = sessionStorage.getItem('fareDetails');
        
        if (!bookingDataStr || !fareDetailsStr) {
            showError('Booking data not found');
            return;
        }
        
        try {
            const booking = JSON.parse(bookingDataStr);
            const fareDetails = JSON.parse(fareDetailsStr);
            
            // Show loading state
            const payButton = document.querySelector('.pay-btn');
            payButton.disabled = true;
            payButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            
            // Get payment method
            const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
            let paymentDetails = {};
            
            // For UPI payment - accept any UPI ID without validation
            if (paymentMethod === 'upi') {
                const upiId = document.getElementById('upi-id').value;
                if (!upiId) {
                    showError('Please enter UPI ID');
                    payButton.disabled = false;
                    payButton.innerHTML = `Pay ₹${fareDetails.totalFare}`;
                    return;
                }
                
                paymentDetails = { type: 'upi', upiId };
            } 
            // For card payment
            else {
                const cardNumber = document.getElementById('card-number').value;
                const expiryDate = document.getElementById('expiry-date').value;
                const cvv = document.getElementById('cvv').value;
                const cardholderName = document.getElementById('card-name').value;
                
                if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
                    showError('Please fill in all card details');
                    payButton.disabled = false;
                    payButton.innerHTML = `Pay ₹${fareDetails.totalFare}`;
                    return;
                }
                
                paymentDetails = {
                    type: 'card',
                    cardNumber,
                    expiryDate,
                    cardholderName
                };
            }
            
            // Create ticket data combining booking and payment details
            const ticketData = {
                ...booking,
                bookingId,
                ...fareDetails,
                paymentMethod,
                paymentDetails,
                paymentDate: new Date().toISOString(),
                status: 'CONFIRMED'
            };
            
            // Store ticket data in sessionStorage for the ticket page
            sessionStorage.setItem('ticketData', JSON.stringify(ticketData));
            
            // Simulate payment processing delay
            setTimeout(function() {
                window.location.href = `ticket.html?bookingId=${bookingId}`;
            }, 1500);
            
        } catch (error) {
            console.error('Payment processing error:', error);
            showError('Payment processing failed');
            
            // Reset button state
            const payButton = document.querySelector('.pay-btn');
            payButton.disabled = false;
            payButton.innerHTML = 'Retry Payment';
        }
    });
}

// Add this function to setup the profile tabs
function setupProfileTabs() {
    const tabLinks = document.querySelectorAll('.profile-menu a');
    const tabs = document.querySelectorAll('.profile-tab');
    
    if (tabLinks.length === 0 || tabs.length === 0) return;
    
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links and tabs
            tabLinks.forEach(l => l.classList.remove('active'));
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Show the corresponding tab
            const tabId = this.getAttribute('data-tab');
            const tab = document.getElementById(tabId);
            if (tab) {
                tab.classList.add('active');
                
                // If bookings tab is selected, refresh the bookings
                if (tabId === 'bookings') {
                    fetchUserBookings();
                }
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    
    // Init functions based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'home.html';
    
    if (currentPage === 'profile.html') {
        // Redirect if not logged in
        if (!requireAuth()) return;
        
        // Fetch profile and set up tabs
        fetchUserProfile();
        setupProfileTabs();
        
        // Ensure first tab is active by default
        const firstTabLink = document.querySelector('.profile-menu a');
        const firstTabId = firstTabLink?.getAttribute('data-tab');
        if (firstTabId) {
            const firstTab = document.getElementById(firstTabId);
            if (firstTab) {
                firstTab.classList.add('active');
                firstTabLink.classList.add('active');
            }
        }
    } else if (currentPage === 'train_details.html') {
        // ...existing code...
    }
    // ...existing code...
});

// Add this to your main.js file

// Set up tourism carousel
function setupTourismCarousel() {
    const track = document.querySelector('.carousel-track');
    if (!track) return;
    
    const slides = Array.from(track.children);
    const nextButton = document.querySelector('.next-button');
    const prevButton = document.querySelector('.prev-button');
    const dotsNav = document.querySelector('.carousel-nav');
    const dots = Array.from(dotsNav.children);
    
    const slideWidth = slides[0].getBoundingClientRect().width;
    
    // Arrange slides next to each other
    slides.forEach((slide, index) => {
        slide.style.left = slideWidth * index + 'px';
    });
    
    // Move slide function
    const moveToSlide = (track, currentSlide, targetSlide) => {
        track.style.transform = 'translateX(-' + targetSlide.style.left + ')';
        currentSlide.classList.remove('current-slide');
        targetSlide.classList.add('current-slide');
    };
    
    // Update dots function
    const updateDots = (currentDot, targetDot) => {
        currentDot.classList.remove('current-slide');
        targetDot.classList.add('current-slide');
    };
    
    // Hide arrows at beginning and end
    const hideShowArrows = (slides, prevButton, nextButton, targetIndex) => {
        if (targetIndex === 0) {
            prevButton.classList.add('is-hidden');
            nextButton.classList.remove('is-hidden');
        } else if (targetIndex === slides.length - 1) {
            prevButton.classList.remove('is-hidden');
            nextButton.classList.add('is-hidden');
        } else {
            prevButton.classList.remove('is-hidden');
            nextButton.classList.remove('is-hidden');
        }
    };
    
    // When click left, move slides left
    prevButton.addEventListener('click', e => {
        const currentSlide = track.querySelector('.current-slide');
        const prevSlide = currentSlide.previousElementSibling;
        const currentDot = dotsNav.querySelector('.current-slide');
        const prevDot = currentDot.previousElementSibling;
        const prevIndex = slides.findIndex(slide => slide === prevSlide);
        
        if (!prevSlide) return;
        
        moveToSlide(track, currentSlide, prevSlide);
        updateDots(currentDot, prevDot);
        hideShowArrows(slides, prevButton, nextButton, prevIndex);
    });
    
    // When click right, move slides right
    nextButton.addEventListener('click', e => {
        const currentSlide = track.querySelector('.current-slide');
        const nextSlide = currentSlide.nextElementSibling;
        const currentDot = dotsNav.querySelector('.current-slide');
        const nextDot = currentDot.nextElementSibling;
        const nextIndex = slides.findIndex(slide => slide === nextSlide);
        
        if (!nextSlide) return;
        
        moveToSlide(track, currentSlide, nextSlide);
        updateDots(currentDot, nextDot);
        hideShowArrows(slides, prevButton, nextButton, nextIndex);
    });
    
    // When click indicators, move to that slide
    dotsNav.addEventListener('click', e => {
        const targetDot = e.target.closest('button');
        
        if (!targetDot) return;
        
        const currentSlide = track.querySelector('.current-slide');
        const currentDot = dotsNav.querySelector('.current-slide');
        const targetIndex = dots.findIndex(dot => dot === targetDot);
        const targetSlide = slides[targetIndex];
        
        moveToSlide(track, currentSlide, targetSlide);
        updateDots(currentDot, targetDot);
        hideShowArrows(slides, prevButton, nextButton, targetIndex);
    });
    
    // Auto slide every 5 seconds
    let slideInterval = setInterval(() => {
        const currentSlide = track.querySelector('.current-slide');
        let nextSlide = currentSlide.nextElementSibling;
        
        if (!nextSlide) {
            nextSlide = slides[0]; // Loop back to first slide
        }
        
        const currentDot = dotsNav.querySelector('.current-slide');
        const nextIndex = slides.findIndex(slide => slide === nextSlide);
        const nextDot = dots[nextIndex];
        
        moveToSlide(track, currentSlide, nextSlide);
        updateDots(currentDot, nextDot);
        hideShowArrows(slides, prevButton, nextButton, nextIndex);
    }, 5000);
    
    // Stop auto slide on hover
    track.addEventListener('mouseenter', () => {
        clearInterval(slideInterval);
    });
    
    // Resume auto slide when mouse leaves
    track.addEventListener('mouseleave', () => {
        slideInterval = setInterval(() => {
            const currentSlide = track.querySelector('.current-slide');
            let nextSlide = currentSlide.nextElementSibling;
            
            if (!nextSlide) {
                nextSlide = slides[0]; // Loop back to first slide
            }
            
            const currentDot = dotsNav.querySelector('.current-slide');
            const nextIndex = slides.findIndex(slide => slide === nextSlide);
            const nextDot = dots[nextIndex];
            
            moveToSlide(track, currentSlide, nextSlide);
            updateDots(currentDot, nextDot);
            hideShowArrows(slides, prevButton, nextButton, nextIndex);
        }, 5000);
    });
}

// Add the carousel setup to your DOMContentLoaded event
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    
    const currentPage = window.location.pathname.split('/').pop() || 'home.html';
    
    if (currentPage === 'home.html') {
        setupTourismCarousel();
    }
    
    // ...existing code...
});