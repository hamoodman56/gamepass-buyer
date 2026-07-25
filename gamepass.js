const axios = require('axios');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36";
const AUTH_URL = 'https://auth.roblox.com/v2/logout';
const REQUEST_TIMEOUT = 10000;

const createHeaders = (cookie, extraHeaders = {}) => ({
    'User-Agent': USER_AGENT,
    'Content-Type': 'application/json',
    Cookie: `.ROBLOSECURITY=${cookie}`,
    ...extraHeaders
});

class Info {
    static async getInfo(id) {
        console.log(`[Step 1] Fetching product info for gamepass ${id}...`);
        const { data } = await axios.get(`https://apis.roblox.com/game-passes/v1/game-passes/${id}/product-info`, {
            timeout: REQUEST_TIMEOUT
        });
        
        // Ensure price and sellerId are strict integers
        const productId = Number(data.ProductId);
        const sellerId = Number(data.Creator.Id);
        const price = data.PriceInRobux !== null ? Number(data.PriceInRobux) : 0;

        console.log(`[Step 1 Done] Product ID: ${productId} | Seller ID: ${sellerId} | Price: ${price}`);
        return [productId, sellerId, price];
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
        
        // Using the v2/user-products endpoint
        const purchaseUrl = `https://economy.roblox.com/v2/user-products/${productId}/purchase`;
        const payload = {
            expectedCurrency: 1,
            expectedPrice: price,
            expectedSellerId: sellerId
        };

        console.log(`[Step 3] Sending purchase payload to ${purchaseUrl}...`);
        console.log(`[Payload]`, JSON.stringify(payload));

        try {
            let response = await axios.post(purchaseUrl, payload, {
                headers: createHeaders(this.cookie, headers),
                timeout: REQUEST_TIMEOUT
            });

            console.log(`[Step 3 Response] Raw Roblox Output:`, JSON.stringify(response.data));

            if (response.data?.purchased) {
                console.log(`[Step 3 Success] Gamepass ${id} successfully bought!`);
                return response.data;
            } else {
                const status = response.data?.reason || response.data?.transactionStatus || 'Unknown';
                console.warn(`[Step 3 Declined] Purchase did not go through. Reason: ${status}`);
                throw new Error(`Purchase declined by Roblox: ${status}`);
            }

        } catch (error) {
            const responseHeaders = error.response?.headers || {};
            const newCsrf = responseHeaders['x-csrf-token'];

            if (error.response?.status === 403 && newCsrf && newCsrf !== headers['X-CSRF-TOKEN']) {
                console.log('X-CSRF-TOKEN expired. Retrying with updated token...');
                headers['X-CSRF-TOKEN'] = newCsrf;
                
                let retryResponse = await axios.post(purchaseUrl, payload, {
                    headers: createHeaders(this.cookie, headers),
                    timeout: REQUEST_TIMEOUT
                });

                console.log(`[Step 3 Retry Response] Raw Roblox Output:`, JSON.stringify(retryResponse.data));

                if (retryResponse.data?.purchased) {
                    console.log(`[Step 3 Success] Retry succeeded! Gamepass bought.`);
                    return retryResponse.data;
                } else {
                    const status = retryResponse.data?.reason || retryResponse.data?.transactionStatus || 'Unknown';
                    console.warn(`[Step 3 Declined] Retry purchase declined. Reason: ${status}`);
                    throw new Error(`Purchase declined by Roblox: ${status}`);
                }
            }

            if (error.response?.data) {
                console.error('Roblox API Error Details:', JSON.stringify(error.response.data));
            }
            throw error;
        }
    }
}

module.exports = { Buyer };
