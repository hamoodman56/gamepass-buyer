const express = require('express');
const { Buyer } = require('./gamepass');

const app = express();
const PORT = process.env.PORT || 3000;

const config = {
    cookie: process.env.ROBLOX_COOKIE,
    gamepass: {
        id: 1927572640,       // Gamepass ID
        amount: 1,           // Purchase times
        cooldownTime: 1      // Seconds between purchases
    }
};

async function runAutoBuy() {
    try {
        const buyer = new Buyer(config.cookie);
        console.log(`Starting auto-buy for gamepass ${config.gamepass.id}`);
        await buyer.autoBuy(
            config.gamepass.id,
            config.gamepass.amount,
            config.gamepass.cooldownTime
        );
        console.log('Auto-buy completed');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Basic health check route for Render
app.get('/', (req, res) => {
    res.send('Gamepass Buyer Service is running.');
});

// Endpoint to manually trigger the purchase task
app.get('/buy', async (req, res) => {
    res.send('Auto-buy process initiated.');
    await runAutoBuy();
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    // Optional: Uncomment the line below to auto-run on deployment start
    // runAutoBuy();
});
