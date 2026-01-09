const request = require('supertest');
const app = require('./index');

describe('GET /testApi', () => {
    it('should return OK!', async () => {
        const response = await request(app).get('/testApi');
        expect(response.status).toBe(200);
        expect(response.text).toBe('OK!');
    });
});
