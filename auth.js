const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    // Get the token from the "Authorization" header
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ error: 'No token provided' });
    }

    try {
        // Remove "Bearer " from the string if it exists
        const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;
        
        // Verify the token using our secret key
        const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
        
        // Attach the user data to the request so other routes can use it
        req.user = decoded; 
        next(); // Move to the next function (the actual route)
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

module.exports = verifyToken;