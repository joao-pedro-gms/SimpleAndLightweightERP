require('dotenv').config();

const express = require('express')
const app = express()
const port = process.env.PORT || 3000

app.get('/testApi', (req, res) => {
    res.send('OK!')
});

app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'healthy' });
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`listening at http://localhost:${port}`)
    });
}

module.exports = app;