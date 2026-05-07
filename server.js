require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'No token' });

    jwt.verify(token, 'mySuperSecret123', (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
};

// ======================
// 🩺 HEALTH CHECK
// ======================
app.get('/', (req, res) => {
    res.send('Theater API is running! 🎭');
});

// ======================
// 🎭 THEATRE & WIZARD ROUTES
// ======================

// 1. Get all theatres
app.get('/theatres', async (req, res) => {
    try {
        const [theatres] = await db.query('SELECT * FROM theatres');
        res.json(theatres);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch theatres' });
    }
});

// 2. Get ONLY plays for a specific theatre (The one we just added!)
app.get('/theatres/:id/shows', async (req, res) => {
    try {
        const [shows] = await db.query('SELECT * FROM shows WHERE theatre_id = ?', [req.params.id]);
        res.json(shows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Get all shows (General)
app.get('/shows', async (req, res) => {
    try {
        const [shows] = await db.query('SELECT * FROM shows');
        res.json(shows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Get showtimes for a specific show
app.get('/shows/:id/showtimes', async (req, res) => {
    try {
        const [times] = await db.query('SELECT * FROM showtimes WHERE show_id = ?', [req.params.id]);
        res.json(times);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. Get seats + check if they are taken for a specific showtime
app.get('/showtimes/:showtimeId/seats', async (req, res) => {
    try {
        const { showtimeId } = req.params;
        
        // This query gets ALL seats but also checks the reservations table
        const query = `
            SELECT 
                s.*, 
                (SELECT COUNT(*) FROM reservations r 
                 WHERE r.seat_id = s.seat_id 
                 AND r.showtime_id = ?) AS is_taken
            FROM seats s
            WHERE s.theatre_id = (
                SELECT sh.theatre_id FROM shows sh 
                JOIN showtimes st ON sh.show_id = st.show_id 
                WHERE st.showtime_id = ?
            )
        `;
        
        const [seats] = await db.query(query, [showtimeId, showtimeId]);
        res.json(seats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ======================
// 👤 AUTH ROUTES
// ======================

app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;
        await db.query(query, [name, email, hashedPassword]);
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email already in use!' });
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(401).json({ error: 'User not found!' });
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Incorrect password!' });

        const token = jwt.sign(
            { user_id: user.user_id, name: user.name, email: user.email }, 
            'mySuperSecret123', 
            { expiresIn: '2h' }
        );

        res.json({ message: 'Login successful!', token, user: { id: user.user_id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// ======================
// 🎟️ PROTECTED ROUTES
// ======================

app.post('/reservations', authenticateToken, async (req, res) => {
    const { showtime_id, seat_id } = req.body;
    const user_id = req.user.user_id;
    try {
        const query = `INSERT INTO reservations (user_id, showtime_id, seat_id, status) VALUES (?, ?, ?, 'CONFIRMED')`;
        await db.query(query, [user_id, showtime_id, seat_id]);
        res.status(201).json({ message: 'Seat reserved successfully!' });
    } catch (error) {
        console.error('Reservation Error:', error);
        res.status(500).json({ error: 'Failed to reserve seat.' });
    }
});

app.get('/my-profile', authenticateToken, async (req, res) => {
    const user_id = req.user.user_id;
    try {
        const [users] = await db.query(`SELECT name, email, created_at FROM users WHERE user_id = ?`, [user_id]);
        const [reservations] = await db.query(
            `SELECT r.reservation_id, r.seat_id, r.status, st.start_time, s.title AS show_title, t.name AS theatre_name, se.seat_number
            FROM reservations r
            JOIN showtimes st ON r.showtime_id = st.showtime_id
            JOIN shows s ON st.show_id = s.show_id
            JOIN theatres t ON s.theatre_id = t.theatre_id
            JOIN seats se ON r.seat_id = se.seat_id
            WHERE r.user_id = ?
            ORDER BY st.start_time ASC`,
            [user_id]
        );
        res.json({ user: users[0], reservations });
    } catch (error) {
        console.error('Profile Error:', error);
        res.status(500).json({ error: 'Failed to load profile.' });
    }
});

// ======================
// 🚀 START SERVER
// ======================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});