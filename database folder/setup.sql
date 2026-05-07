-- 1. Create the Database
DROP DATABASE IF EXISTS theater_app;
CREATE DATABASE theater_app;
USE theater_app;

-- 2. Create the Tables
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), 
    external_id VARCHAR(255) UNIQUE
);

CREATE TABLE theatres (
    theatre_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE shows (
    show_id INT AUTO_INCREMENT PRIMARY KEY,
    theatre_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    FOREIGN KEY (theatre_id) REFERENCES theatres(theatre_id) ON DELETE CASCADE
);

CREATE TABLE showtimes (
    showtime_id INT AUTO_INCREMENT PRIMARY KEY,
    show_id INT,
    start_time DATETIME NOT NULL,
    FOREIGN KEY (show_id) REFERENCES shows(show_id) ON DELETE CASCADE
);

CREATE TABLE seats (
    seat_id INT AUTO_INCREMENT PRIMARY KEY,
    theatre_id INT,
    seat_number VARCHAR(10) NOT NULL,
    category VARCHAR(50),
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (theatre_id) REFERENCES theatres(theatre_id) ON DELETE CASCADE
);

CREATE TABLE reservations (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    showtime_id INT,
    seat_id INT,
    status ENUM('PENDING', 'CONFIRMED', 'CANCELLED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (showtime_id) REFERENCES showtimes(showtime_id),
    FOREIGN KEY (seat_id) REFERENCES seats(seat_id),
    UNIQUE KEY unique_seat_booking (showtime_id, seat_id, status)
);

-- 3. Insert Dummy Data
INSERT INTO theatres (name, location, description) 
VALUES ('National Theatre', 'Athens', 'Main stage for classic plays');

INSERT INTO shows (theatre_id, title, description) 
VALUES (1, 'Hamlet', 'A tragedy by William Shakespeare');

INSERT INTO showtimes (show_id, start_time) 
VALUES (1, DATE_ADD(NOW(), INTERVAL 1 DAY));

INSERT INTO seats (theatre_id, seat_number, category, price) VALUES 
(1, 'A1', 'VIP', 50.00),
(1, 'A2', 'VIP', 50.00),
(1, 'B1', 'Regular', 20.00);