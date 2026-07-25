const axios = require('axios');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36";
const AUTH_URL = 'https://auth.roblox.com/v2/logout';
const REQUEST_TIMEOUT = 10000; // 10 seconds max per request

const createHeaders = (cookie, extraHeaders = {}) => ({
    'User-Agent': USER_AGENT,
    Cookie: `.ROBLOSECURITY=${cookie}`,
    ...extraHeaders
});

class Info {
    static async getInfo(id) {
        console.log(`[Step 1] Fetching product info for gamepass ${id}...`);
        const { data } = await axios.get(`https://apis.roblox.com/game-passes/v1/game-passes/${id}/product-info`, {
            timeout: REQUEST_TIMEOUT
        });
        console.log(`[Step 1 Done] Product ID: ${data.ProductId}`);
        return [data.ProductId, data.Creator.Id, data.PriceInRobux];
    }

    static async getXsrf(cookie) {
        console.log(`[Step 2] Fetching X-CSRF token from Roblox...`);
        try {
            const response = await axios.post(AUTH_URL, {}, {
                headers: createHeaders(cookie),
                timeout: REQUEST_TIMEOUT
            });
            return response.headers['x-csrf-token'] || '';
        } catch (error) {
            const token = error.response?.headers['x-csrf-token'] || '';
            console.log(`[Step 2 Done] X-CSRF token acquired.`);
            return token;
        }
    }

    static async getHeaders(cookie) {
        const xsrf = await this.getXsrf(cookie);
        return {
            "X-CSRF-TOKEN": xsrf
        };
    }
}

class Buyer {
    constructor(cookie) {
        this.cookie = cookie;
    }

    async buy(id) {
        const [productId, sellerId, price] = await Info.getInfo(id);
        let headers = await Info.getHeaders(this.cookie);
        
        const purchaseUrl = `https://economy.roblox.com/v1/purchases/products/${productId}`;
        const payload = {
            expectedCurrency: 1,
            expectedPrice: price,
            expectedSellerId: sellerId
        };

        console.log(`[Step 3] Sending purchase payload to Roblox...`);
        try {
            await axios.post(purchaseUrl, payload, {
                headers: createHeaders(this.cookie, headers),
                timeout: REQUEST_TIMEOUT
            });
            console.log(`[Step 3 Done] Purchase completed successfully!`);
        } catch (error) {
            const responseHeaders = error.response?.headers || {};
            const newCsrf = responseHeaders['x-csrf-token'];

            if (error.response?.status === 403 && newCsrf && newCsrf !== headers['X-CSRF-TOKEN']) {
                console.log('X-CSRF-TOKEN expired. Retrying with updated token...');
                headers['X-CSRF-TOKEN'] = newCsrf;
                
                await axios.post(purchaseUrl, payload, {
                    headers: createHeaders(this.cookie, headers),
                    timeout: REQUEST_TIMEOUT
                });
                console.log(`[Step 3 Done] Retry purchase completed successfully!`);
                return;
            }

            if (error.code === 'ECONNABORTED') {
                console.error('Request timed out: Roblox silently dropped the connection from Render\'s IP.');
            } else if (error.response?.data) {
                console.error('Roblox API Error Details:', JSON.stringify(error.response.data));
            }
            throw error;
        }
    }
}

module.exports = { Buyer };
