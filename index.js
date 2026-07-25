const express = require('express');
const { Buyer } = require('./gamepass');

const app = express();
app.use(express.json()); // Allows Express to read JSON data from Roblox

const PORT = process.env.PORT || 3000;
const COOKIE = process.env.ROBLOX_COOKIE;
const API_KEY = process.env.API_KEY; // Your secret password

const buyer = new Buyer(COOKIE);

app.post('/buy-gamepass', async (req, res) => {
    // 1. Check for authorization
    const providedKey = req.headers['x-api-key'];
    if (providedKey !== API_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // 2. Check for the ID
    const { gamepassId } = req.body;
    if (!gamepassId) {
        return res.status(400).json({ success: false, message: 'Missing gamepassId' });
    }

    // 3. Attempt the purchase
    try {
        console.log(`Attempting to buy gamepass: ${gamepassId}`);
        await buyer.buy(gamepassId); // Uses the buy function directly
        return res.json({ success: true, message: 'Purchase successful' });
    } catch (error) {
        console.error(`Purchase failed for ${gamepassId}:`, error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
