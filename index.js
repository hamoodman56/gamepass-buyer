const { Buyer } = require('./gamepass');

const config = {
   cookie: process.env.ROBLOX_COOKIE,
   gamepass: {
       id: 1927572640,      // Gamepass ID
       amount: 1,         // Purchase times
       cooldownTime: 1    // Seconds between purchases
   }
};

async function main() {
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

main();
