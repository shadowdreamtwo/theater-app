USE theater_app;

-- Add a Theater
INSERT INTO theatres (name, location, description) 
VALUES ('National Theatre', 'Athens', 'Main stage for classic plays');

-- Add a Show
INSERT INTO shows (theatre_id, title, description) 
VALUES (1, 'Hamlet', 'A tragedy by William Shakespeare');

-- Add a Showtime (Tomorrow at 8 PM)
INSERT INTO showtimes (show_id, start_time) 
VALUES (1, DATE_ADD(NOW(), INTERVAL 1 DAY));

-- Add a few Seats
INSERT INTO seats (theatre_id, seat_number, category, price) VALUES 
(1, 'A1', 'VIP', 50.00),
(1, 'A2', 'VIP', 50.00),
(1, 'B1', 'Regular', 20.00);