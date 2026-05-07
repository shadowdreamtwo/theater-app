import axios from 'axios';

const BASE_URL = 'http://10.0.2.2:3000'; 

const api = axios.create({
    baseURL: BASE_URL,
});

export const getTheatres = async () => {
    try {
        const response = await api.get('/theatres');
        return response.data;
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};

export const registerUser = async (name, email, password) => {
    try {
        const response = await api.post('/register', { name, email, password });
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const loginUser = async (email, password) => {
    try {
        const response = await api.post('/login', { email, password });
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

// 🆕 NEW: Make a reservation (Requires Token)
export const makeReservation = async (showtime_id, seat_id, token) => {
    try {
        const response = await api.post('/reservations', 
            { showtime_id, seat_id },
            { headers: { Authorization: `Bearer ${token}` } } // The VIP Pass!
        );
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const getUserProfile = async (token) => {
    try {
        const response = await api.get('/my-profile', {
            headers: { Authorization: `Bearer ${token}` } // The VIP Pass!
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
}; // <--- THIS WAS THE MISSING CLOSING BRACKET!

// --- WIZARD LIVE FETCHING FUNCTIONS ---

export const getShows = async () => {
    const response = await api.get('/shows');
    return response.data;
};

export const getShowtimes = async (showId) => {
    const response = await api.get(`/shows/${showId}/showtimes`);
    return response.data;
};

export const getSeats = async (showtimeId) => {
    const response = await api.get(`/showtimes/${showtimeId}/seats`);
    return response.data;
};
export const getShowsByTheatre = async (theatreId) => {
    const response = await api.get(`/theatres/${theatreId}/shows`);
    return response.data;
};
export default api;