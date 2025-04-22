const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Log all environment variables for debugging
console.log('Environment variables:');
console.log('DB_PATH:', process.env.DB_PATH);
console.log('PORT:', process.env.PORT);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '[REDACTED]' : 'undefined');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Add request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Create database directory if it doesn't exist
const dbDir = path.resolve(__dirname, '../../database');
if (!fs.existsSync(dbDir)) {
    console.log(`Creating database directory at: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
}

// Database connection
let db;
async function initializeDB() {
    try {
        // Use path.resolve to get absolute path instead of relative path
        const dbPath = path.resolve(__dirname, '../../database/railway.db');
        console.log('Attempting to connect to database at:', dbPath);
        
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        
        // Create tables if they don't exist
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS user_profiles (
                profile_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                full_name TEXT,
                phone TEXT,
                address TEXT,
                date_of_birth TEXT,
                FOREIGN KEY(user_id) REFERENCES users(user_id)
            );
            
            -- Other tables for your railway system
            CREATE TABLE IF NOT EXISTS stations (
                station_id INTEGER PRIMARY KEY AUTOINCREMENT,
                station_name TEXT NOT NULL,
                station_code TEXT NOT NULL,
                city TEXT NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS trains (
                train_id INTEGER PRIMARY KEY AUTOINCREMENT,
                train_number TEXT NOT NULL,
                train_name TEXT NOT NULL,
                source_station INTEGER NOT NULL,
                destination_station INTEGER NOT NULL,
                departure_time TEXT NOT NULL,
                arrival_time TEXT NOT NULL,
                FOREIGN KEY(source_station) REFERENCES stations(station_id),
                FOREIGN KEY(destination_station) REFERENCES stations(station_id)
            );
            
            CREATE TABLE IF NOT EXISTS seats (
                seat_id INTEGER PRIMARY KEY AUTOINCREMENT,
                train_id INTEGER NOT NULL,
                class_type TEXT NOT NULL,
                total_seats INTEGER NOT NULL,
                available_seats INTEGER NOT NULL,
                price REAL NOT NULL,
                FOREIGN KEY(train_id) REFERENCES trains(train_id)
            );
            
            CREATE TABLE IF NOT EXISTS bookings (
                booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                train_id INTEGER NOT NULL,
                seat_id INTEGER NOT NULL,
                journey_date TEXT NOT NULL,
                booking_date TEXT NOT NULL,
                status TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(user_id),
                FOREIGN KEY(train_id) REFERENCES trains(train_id),
                FOREIGN KEY(seat_id) REFERENCES seats(seat_id)
            );
            
            CREATE TABLE IF NOT EXISTS passengers (
                passenger_id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                age INTEGER NOT NULL,
                gender TEXT NOT NULL,
                FOREIGN KEY(booking_id) REFERENCES bookings(booking_id)
            );
        `);
        
        // Add this inside initializeDB after creating the tables
        // Check if station_code column exists in stations table
        try {
            const tableInfo = await db.all("PRAGMA table_info(stations)");
            const hasStationCode = tableInfo.some(col => col.name === 'station_code');
            
            if (!hasStationCode) {
                console.log("Adding station_code column to stations table");
                await db.exec("ALTER TABLE stations ADD COLUMN station_code TEXT");
            }
        } catch (error) {
            console.error("Error checking station_code column:", error);
        }
        
        await seedSampleData();
        
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error; // Re-throw to handle it in the main application
    }
}

// Enhanced seedSampleData function with more comprehensive data
async function seedSampleData() {
    try {
        // Check if we have any stations already
        const stationCount = await db.get('SELECT COUNT(*) as count FROM stations');
        
        if (stationCount.count === 0) {
            console.log('Seeding expanded stations data...');
            
            // Extended list of stations with codes
            await db.exec(`
                INSERT INTO stations (station_name, station_code, city) VALUES 
                ('New Delhi Railway Station', 'NDLS', 'New Delhi'),
                ('Hazrat Nizamuddin', 'NZM', 'New Delhi'),
                ('Delhi Junction', 'DLI', 'Delhi'),
                ('Anand Vihar Terminal', 'ANVT', 'New Delhi'),
                ('Delhi Sarai Rohilla', 'DEE', 'Delhi'),
                ('Delhi Cantt', 'DEC', 'Delhi'),
                ('Mumbai Central', 'MMCT', 'Mumbai'),
                ('Chhatrapati Shivaji Terminus', 'CSMT', 'Mumbai'),
                ('Lokmanya Tilak Terminus', 'LTT', 'Mumbai'),
                ('Bandra Terminus', 'BDTS', 'Mumbai'),
                ('Mumbai Dadar', 'DR', 'Mumbai'),
                ('Chennai Central', 'MAS', 'Chennai'),
                ('Chennai Egmore', 'MS', 'Chennai'),
                ('Howrah Junction', 'HWH', 'Kolkata'),
                ('Sealdah', 'SDAH', 'Kolkata'),
                ('Kolkata', 'KOAA', 'Kolkata'),
                ('Bengaluru City Junction', 'SBC', 'Bengaluru'),
                ('Bengaluru Cantonment', 'BNC', 'Bengaluru'),
                ('Yesvantpur Junction', 'YPR', 'Bengaluru'),
                ('Pune Junction', 'PUNE', 'Pune'),
                ('Secunderabad Junction', 'SC', 'Hyderabad'),
                ('Hyderabad', 'HYB', 'Hyderabad'),
                ('Ahmedabad Junction', 'ADI', 'Ahmedabad'),
                ('Chandigarh Junction', 'CDG', 'Chandigarh'),
                ('Amritsar Junction', 'ASR', 'Amritsar'),
                ('Ludhiana Junction', 'LDH', 'Ludhiana'),
                ('Ambala Cantonment', 'UMB', 'Ambala'),
                ('Lucknow Junction', 'LJN', 'Lucknow'),
                ('Lucknow Charbagh', 'LKO', 'Lucknow'),
                ('Varanasi Junction', 'BSB', 'Varanasi'),
                ('Agra Cantt', 'AGC', 'Agra'),
                ('Agra Fort', 'AF', 'Agra'),
                ('Kanpur Central', 'CNB', 'Kanpur'),
                ('Jalandhar City', 'JUC', 'Jalandhar'),
                ('Panipat Junction', 'PNP', 'Panipat'),
                ('Mathura Junction', 'MTJ', 'Mathura'),
                ('Allahabad Junction', 'PRYJ', 'Prayagraj'),
                ('Gorakhpur Junction', 'GKP', 'Gorakhpur'),
                ('Guwahati', 'GHY', 'Guwahati'),
                ('Kochi', 'ERS', 'Kochi'),
                ('Thiruvananthapuram Central', 'TVC', 'Thiruvananthapuram'),
                ('Jaipur Junction', 'JP', 'Jaipur'),
                ('Jodhpur Junction', 'JU', 'Jodhpur'),
                ('Bhopal Junction', 'BPL', 'Bhopal'),
                ('Patna Junction', 'PNBE', 'Patna'),
                ('Gaya Junction', 'GAYA', 'Gaya'),
                ('Ranchi Junction', 'RNC', 'Ranchi'),
                ('Raipur Junction', 'R', 'Raipur'),
                ('Nagpur Junction', 'NGP', 'Nagpur'),
                ('Vijayawada Junction', 'BZA', 'Vijayawada'),
                ('Visakhapatnam Junction', 'VSKP', 'Visakhapatnam'),
                ('Kota Junction', 'KOTA', 'Kota'),
                ('Surat', 'ST', 'Surat'),
                ('Vadodara Junction', 'BRC', 'Vadodara'),
                ('Jhansi Junction', 'JHS', 'Jhansi'),
                ('Gwalior Junction', 'GWL', 'Gwalior'),
                ('Indore Junction', 'INDB', 'Indore'),
                ('Dehradun', 'DDN', 'Dehradun'),
                ('Haridwar Junction', 'HW', 'Haridwar'),
                ('Jammu Tawi', 'JAT', 'Jammu'),
                ('Coimbatore Junction', 'CBE', 'Coimbatore'),
                ('Madurai Junction', 'MDU', 'Madurai'),
                ('Tiruchirappalli Junction', 'TPJ', 'Tiruchirappalli'),
                ('Mysuru Junction', 'MYS', 'Mysuru'),
                ('Bhubaneswar', 'BBS', 'Bhubaneswar'),
                ('Puri', 'PURI', 'Puri'),
                ('Guntakal Junction', 'GTL', 'Guntakal'),
                ('Itarsi Junction', 'ET', 'Itarsi'),
                ('Bilaspur Junction', 'BSP', 'Bilaspur'),
                ('Kharagpur Junction', 'KGP', 'Kharagpur'),
                ('Asansol Junction', 'ASN', 'Asansol'),
                ('Dhanbad Junction', 'DHN', 'Dhanbad'),
                ('New Jalpaiguri', 'NJP', 'Siliguri'),
                ('Dibrugarh', 'DBRG', 'Dibrugarh'),
                ('Katihar Junction', 'KIR', 'Katihar'),
                ('Muzaffarpur Junction', 'MFP', 'Muzaffarpur'),
                ('Darbhanga Junction', 'DBG', 'Darbhanga'),
                ('Mangaluru Central', 'MAQ', 'Mangaluru')
            `);
            
            console.log('Seeding expanded trains data...');
            
            // Add more train routes
            await db.exec(`
                INSERT INTO trains (train_number, train_name, source_station, destination_station, departure_time, arrival_time) VALUES 
                ('12001', 'Shatabdi Express', 1, 24, '07:00', '10:30'),
                ('12002', 'Shatabdi Express', 24, 1, '17:30', '21:00'),
                ('12951', 'Mumbai Rajdhani', 1, 7, '16:25', '08:15'),
                ('12952', 'Delhi Rajdhani', 7, 1, '17:40', '08:30'),
                ('12953', 'August Kranti Rajdhani', 8, 1, '17:40', '10:55'),
                ('12954', 'August Kranti Rajdhani', 1, 8, '17:05', '10:35'),
                ('12301', 'Howrah Rajdhani', 1, 14, '16:10', '09:55'),
                ('12302', 'Howrah Rajdhani', 14, 1, '14:05', '07:55'),
                ('12305', 'Howrah Rajdhani (Via Patna)', 1, 14, '16:50', '09:50'),
                ('12306', 'Howrah Rajdhani (Via Patna)', 14, 1, '14:30', '08:20'),
                ('12309', 'Rajendra Nagar Rajdhani', 1, 45, '19:25', '08:25'),
                ('12310', 'Rajendra Nagar Rajdhani', 45, 1, '19:10', '07:40'),
                ('12313', 'Sealdah Rajdhani', 1, 15, '16:15', '10:10'),
                ('12314', 'Sealdah Rajdhani', 15, 1, '16:05', '10:00'),
                ('12423', 'Dibrugarh Rajdhani', 1, 75, '21:25', '04:05+2'),
                ('12424', 'Dibrugarh Rajdhani', 75, 1, '20:45', '05:05+2'),
                ('12213', 'Delhi Sarai Rohilla-Secunderabad AC Express', 5, 21, '07:25', '04:25+1'),
                ('12214', 'Secunderabad-Delhi Sarai Rohilla AC Express', 21, 5, '12:45', '09:55+1'),
                ('12259', 'Sealdah Duronto Express', 1, 15, '20:05', '06:50'),
                ('12260', 'Sealdah Duronto Express', 15, 1, '13:50', '01:10+1'),
                ('12261', 'Mumbai CSMT Duronto Express', 1, 8, '23:00', '16:10'),
                ('12262', 'Mumbai CSMT Duronto Express', 8, 1, '19:15', '11:35+1'),
                ('12267', 'Mumbai Central Duronto Express', 1, 7, '23:15', '16:00'),
                ('12268', 'Mumbai Central Duronto Express', 7, 1, '22:45', '14:35+1'),
                ('12269', 'Chennai Central Duronto Express', 1, 11, '22:45', '22:40+1'),
                ('12270', 'Chennai Central Duronto Express', 11, 1, '06:40', '07:55+1'),
                ('12723', 'Telangana Express', 1, 21, '06:35', '15:40'),
                ('12724', 'Telangana Express', 21, 1, '06:25', '15:55'),
                ('12611', 'Chennai Mail', 1, 11, '22:45', '08:15+1'),
                ('12612', 'Chennai Mail', 11, 1, '22:50', '07:55+1'),
                ('12615', 'Grand Trunk Express', 1, 11, '18:40', '07:10+1'),
                ('12616', 'Grand Trunk Express', 11, 1, '19:15', '07:30+1'),
                ('12621', 'Tamil Nadu Express', 1, 11, '22:30', '07:05+1'),
                ('12622', 'Tamil Nadu Express', 11, 1, '22:00', '06:30+1'),
                ('12957', 'Swarna Jayanti Rajdhani', 1, 23, '15:55', '05:45+1'),
                ('12958', 'Swarna Jayanti Rajdhani', 23, 1, '16:00', '05:50+1'),
                ('22691', 'Bengaluru Rajdhani Express', 1, 17, '20:15', '05:30+1'),
                ('22692', 'Bengaluru Rajdhani Express', 17, 1, '20:00', '05:35+1'),
                ('12425', 'New Delhi-Jammu Tawi Rajdhani Express', 1, 61, '20:30', '05:45+1'),
                ('12426', 'Jammu Tawi-New Delhi Rajdhani Express', 61, 1, '19:40', '05:05+1'),
                ('12437', 'Secunderabad Rajdhani Express', 1, 21, '15:50', '13:50+1'),
                ('12438', 'Secunderabad Rajdhani Express', 21, 1, '12:45', '10:05+1'),
                ('12903', 'Golden Temple Mail', 1, 25, '21:30', '05:00+1'),
                ('12904', 'Golden Temple Mail', 25, 1, '21:40', '05:10+1'),
                ('12925', 'Paschim Express', 25, 7, '18:40', '11:30+1'),
                ('12926', 'Paschim Express', 7, 25, '19:35', '12:20+1'),
                ('12909', 'Bandra Terminus Garib Rath Express', 1, 10, '15:35', '08:20+1'),
                ('12910', 'Bandra Terminus Garib Rath Express', 10, 1, '17:55', '11:00+1'),
                ('12649', 'Karnataka Sampark Kranti Express', 1, 17, '13:15', '05:30+1'),
                ('12650', 'Karnataka Sampark Kranti Express', 17, 1, '13:45', '06:30+1'),
                ('12711', 'Pinakini Express', 11, 12, '07:40', '14:15'),
                ('12712', 'Pinakini Express', 12, 11, '07:25', '14:00')
            `);
            
            console.log('Seeding expanded seats data...');
            
            // Insert seats for each train with a more comprehensive approach
            const trains = await db.all('SELECT train_id FROM trains');
            const totalTrains = trains.length;
            
            console.log(`Adding seats for ${totalTrains} trains...`);
            
            for (let i = 0; i < trains.length; i++) {
                const train = trains[i];
                const trainId = train.train_id;
                
                // Determine train type based on train_id for appropriate seat configuration
                if (trainId % 5 === 0) {  // Every 5th train is a premium train (Rajdhani/Shatabdi/Duronto)
                    await db.run(`
                        INSERT INTO seats (train_id, class_type, total_seats, available_seats, price) VALUES
                        (?, '1A', 24, 24, 4800),
                        (?, '2A', 48, 48, 2800),
                        (?, '3A', 64, 64, 1900),
                        (?, 'EC', 73, 73, 1500)
                    `, [trainId, trainId, trainId, trainId]);
                } else if (trainId % 4 === 0) {  // Every 4th train is a mixed class train
                    await db.run(`
                        INSERT INTO seats (train_id, class_type, total_seats, available_seats, price) VALUES
                        (?, '2A', 46, 46, 2200),
                        (?, '3A', 72, 72, 1600),
                        (?, 'SL', 320, 320, 700),
                        (?, 'CC', 78, 78, 850)
                    `, [trainId, trainId, trainId, trainId]);
                } else if (trainId % 3 === 0) {  // Every 3rd train is a sleeper-focused train
                    await db.run(`
                        INSERT INTO seats (train_id, class_type, total_seats, available_seats, price) VALUES
                        (?, '2A', 48, 48, 2500),
                        (?, '3A', 64, 64, 1800),
                        (?, 'SL', 350, 350, 800),
                        (?, 'GN', 250, 250, 450)
                    `, [trainId, trainId, trainId, trainId]);
                } else if (trainId % 2 === 0) {  // Every 2nd train is a standard express
                    await db.run(`
                        INSERT INTO seats (train_id, class_type, total_seats, available_seats, price) VALUES
                        (?, '2A', 52, 52, 2400),
                        (?, '3A', 78, 78, 1700),
                        (?, 'SL', 340, 340, 750)
                    `, [trainId, trainId, trainId]);
                } else {  // All other trains are standard passenger
                    await db.run(`
                        INSERT INTO seats (train_id, class_type, total_seats, available_seats, price) VALUES
                        (?, '3A', 72, 72, 1600),
                        (?, 'SL', 320, 320, 700),
                        (?, 'CC', 80, 80, 900),
                        (?, 'GN', 230, 230, 400)
                    `, [trainId, trainId, trainId, trainId]);
                }
                
                if (i % 10 === 0) {
                    console.log(`Processed ${i}/${totalTrains} trains...`);
                }
            }
            
            console.log('Sample data seeding completed successfully');
        } else {
            console.log(`Database already contains ${stationCount.count} stations. Skipping seed data.`);
        }
    } catch (error) {
        console.error('Error seeding sample data:', error);
    }
}

// Initialize database
initializeDB().catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Routes
// Replace the existing search-trains endpoint

app.post('/api/search-trains', async (req, res) => {
    console.log("Search trains request received:", req.body);
    const { from, to, date, classType } = req.body;
    
    try {
        // First check if we're searching by station code
        let query = `
            SELECT DISTINCT t.train_id, t.train_number, t.train_name, 
                   t.departure_time, t.arrival_time,
                   s1.station_name as source_station, s1.station_code as source_code,
                   s2.station_name as destination_station, s2.station_code as destination_code,
                   c.class_type, c.available_seats, c.price
            FROM trains t
            JOIN stations s1 ON t.source_station = s1.station_id
            JOIN stations s2 ON t.destination_station = s2.station_id
            JOIN seats c ON t.train_id = c.train_id
            WHERE (s1.station_code = ? OR s1.station_name LIKE ? OR s1.city LIKE ?)
            AND (s2.station_code = ? OR s2.station_name LIKE ? OR s2.city LIKE ?)
            AND c.available_seats > 0
        `;
        
        // Use exact match for station codes, fuzzy match for names and cities
        const params = [
            from, `%${from}%`, `%${from}%`,
            to, `%${to}%`, `%${to}%`
        ];
        
        console.log("SQL Query:", query);
        console.log("Parameters:", params);
        
        // Add class type filter if not "all"
        if (classType && classType !== 'all') {
            query += ' AND c.class_type = ?';
            params.push(classType);
        }
        
        // Add ordering
        query += ' ORDER BY t.departure_time';
        
        const trains = await db.all(query, params);
        console.log(`Found ${trains.length} trains`);
        
        res.json(trains);
    } catch (error) {
        console.error('Search trains error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/book-ticket', authenticateToken, async (req, res) => {
    const { trainId, passenger, classType } = req.body;
    const userId = req.user.id;

    const connection = await db.run('BEGIN TRANSACTION');
    try {
        // Check seat availability
        const [seat] = await db.all(`
            SELECT * FROM seats 
            WHERE train_id = ? AND class_type = ? AND available_seats > 0
        `, [trainId, classType]);

        if (!seat) throw new Error('No seats available');

        // Create booking
        const booking = await db.run(`
            INSERT INTO bookings (user_id, train_id, seat_id, journey_date, status)
            VALUES (?, ?, ?, ?, 'PENDING')
        `, [userId, trainId, seat.seat_id, req.body.journeyDate]);

        // Update seat availability
        await db.run(`
            UPDATE seats 
            SET available_seats = available_seats - 1 
            WHERE seat_id = ?
        `, [seat.seat_id]);

        await db.run('COMMIT');
        res.json({ 
            success: true, 
            bookingId: booking.lastID 
        });
    } catch (error) {
        await db.run('ROLLBACK');
        res.status(500).json({ error: error.message });
    }
});

// Auth routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        
        // Validate inputs
        if (!username || !password || !email) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        // Check if user already exists
        const existingUser = await db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email]);
        if (existingUser) {
            return res.status(400).json({ 
                error: existingUser.username === username 
                    ? 'Username already taken' 
                    : 'Email already registered' 
            });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const currentDate = new Date().toISOString();
        
        const result = await db.run(`
            INSERT INTO users (username, password, email, created_at)
            VALUES (?, ?, ?, ?)
        `, [username, hashedPassword, email, currentDate]);

        res.status(201).json({ 
            success: true,
            message: 'Registration successful!'
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message || 'Registration failed' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await db.get(`
            SELECT * FROM users WHERE username = ?
        `, [username]);

        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET);
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add these new routes to your server.js file

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await db.get(`
            SELECT user_id, username, email, created_at
            FROM users WHERE user_id = ?
        `, [userId]);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Don't send the password
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user bookings
app.get('/api/bookings', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const bookings = await db.all(`
            SELECT b.booking_id, b.journey_date, b.status,
                   t.train_number, t.train_name, t.departure_time, t.arrival_time,
                   s1.station_name as source_station, s2.station_name as destination_station,
                   s.class_type, s.price
            FROM bookings b
            JOIN trains t ON b.train_id = t.train_id
            JOIN seats s ON b.seat_id = s.seat_id
            JOIN stations s1 ON t.source_station = s1.station_id
            JOIN stations s2 ON t.destination_station = s2.station_id
            WHERE b.user_id = ?
            ORDER BY b.booking_date DESC
        `, [userId]);

        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get train details
app.get('/api/train/:id', async (req, res) => {
    try {
        const trainId = req.params.id;
        const train = await db.get(`
            SELECT t.*, s1.station_name as source_station, s2.station_name as destination_station
            FROM trains t
            JOIN stations s1 ON t.source_station = s1.station_id
            JOIN stations s2 ON t.destination_station = s2.station_id
            WHERE t.train_id = ?
        `, [trainId]);

        if (!train) {
            return res.status(404).json({ error: 'Train not found' });
        }

        // Get available classes for this train
        const classes = await db.all(`
            SELECT class_type, total_seats, available_seats, price
            FROM seats
            WHERE train_id = ?
        `, [trainId]);

        train.classes = classes;
        
        res.json(train);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user profile
app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { fullName, email, phone, address, dob } = req.body;

        // Check if user has a profile record already
        let profile = await db.get(`
            SELECT * FROM user_profiles WHERE user_id = ?
        `, [userId]);

        if (profile) {
            // Update existing profile
            await db.run(`
                UPDATE user_profiles 
                SET full_name = ?, email = ?, phone = ?, address = ?, date_of_birth = ?
                WHERE user_id = ?
            `, [fullName, email, phone, address, dob, userId]);
        } else {
            // Create new profile
            await db.run(`
                INSERT INTO user_profiles (user_id, full_name, email, phone, address, date_of_birth)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [userId, fullName, email, phone, address, dob]);
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Change password
app.post('/api/change-password', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        // Verify current password
        const user = await db.get(`
            SELECT * FROM users WHERE user_id = ?
        `, [userId]);

        if (!user || !await bcrypt.compare(currentPassword, user.password)) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.run(`
            UPDATE users SET password = ? WHERE user_id = ?
        `, [hashedPassword, userId]);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Improved stations API endpoint with better error handling
app.get('/api/stations', async (req, res) => {
    try {
        console.log('Stations API called');
        
        // Query with proper error handling
        const stations = await db.all(`
            SELECT station_id, station_name, station_code, city
            FROM stations
            ORDER BY station_name
        `);
        
        // Log a sample of the results for debugging
        if (stations.length > 0) {
            console.log(`Found ${stations.length} stations. First station:`, stations[0]);
        } else {
            console.log('No stations found in database');
        }
        
        res.json(stations);
    } catch (error) {
        console.error('Get stations error:', error);
        res.status(500).json({ 
            error: error.message, 
            stack: process.env.NODE_ENV === 'production' ? null : error.stack 
        });
    }
});

// Add better error handling middleware at the end of your server.js file
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});