const express = require('express');
const { Buyer } = require('./gamepass');

const app = express();
app.use(express.json());

// Log every incoming request so you can see it in Render logs
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} request to ${req.url}`);
    next();
});

const PORT = process.env.PORT || 3000;
const COOKIE = process.env.ROBLOX_COOKIE;
const API_KEY = process.env.API_KEY;

const buyer = new Buyer(COOKIE);

// Root route - Visit this in your web browser to check if the server is live
app.get('/', (req, res) => {
    res.send('Server is live and listening!');
});

// The endpoint Roblox sends POST requests to
app.post('/buy-gamepass', async (req, res) => {
    const providedKey = req.headers['x-api-key'];
    if (providedKey !== API_KEY) {
        console.warn('Unauthorized attempt: Invalid or missing API key');
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { gamepassId } = req.body;
    if (!gamepassId) {
        return res.status(400).json({ success: false, message: 'Missing gamepassId' });
    }

    try {
        console.log(`Attempting to buy gamepass: ${gamepassId}`);
        await buyer.buy(gamepassId);
        return res.json({ success: true, message: 'Purchase successful' });
    } catch (error) {
        console.error(`Purchase failed for ${gamepassId}:`, error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
