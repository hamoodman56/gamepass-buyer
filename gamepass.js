const axios = require('axios');

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36";
const AUTH_URL = 'https://auth.roblox.com/v2/logout';

const createHeaders = (cookie, extraHeaders = {}) => ({
    'User-Agent': USER_AGENT,
    Cookie: `.ROBLOSECURITY=${cookie}`,
    ...extraHeaders
});

class Info {
    static async getInfo(id) {
        const { data } = await axios.get(`https://apis.roblox.com/game-passes/v1/game-passes/${id}/product-info`);
        return [data.ProductId, data.Creator.Id, data.PriceInRobux];
    }

    static async getXsrf(cookie) {
        try {
            const response = await axios.post(AUTH_URL, {}, {
                headers: createHeaders(cookie)
            });
            return response.headers['x-csrf-token'] || '';
        } catch (error) {
            return error.response?.headers['x-csrf-token'] || '';
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

        try {
            await axios.post(purchaseUrl, payload, {
                headers: createHeaders(this.cookie, headers)
            });
        } catch (error) {
            const responseHeaders = error.response?.headers || {};
            const newCsrf = responseHeaders['x-csrf-token'];

            // 1. Automatic CSRF retry if Roblox returns a new token on 403
            if (error.response?.status === 403 && newCsrf && newCsrf !== headers['X-CSRF-TOKEN']) {
                console.log('X-CSRF-TOKEN expired/invalid. Retrying with new token...');
                headers['X-CSRF-TOKEN'] = newCsrf;
                
                await axios.post(purchaseUrl, payload, {
                    headers: createHeaders(this.cookie, headers)
                });
                return;
            }

            // 2. Log exact response payload from Roblox to identify IP/Captcha/Auth issues
            if (error.response?.data) {
                console.error('Roblox API Error Details:', JSON.stringify(error.response.data));
            }
            throw error;
        }
    }

    async autoBuy(id, amount, cooldownTime) {
        for (let i = 0; i < amount; i++) {
            try {
                await this.buy(id);
                await new Promise(resolve => setTimeout(resolve, cooldownTime * 1000));
            } catch (error) {
                console.error(`Auto-buy failed at iteration ${i + 1}:`, error.message);
            }
        }
    }
}

module.exports = { Buyer };
