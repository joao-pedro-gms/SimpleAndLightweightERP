require('dotenv').config();

const express = require('express')
const app = express()
const port = process.env.PORT || 3000

// Middleware para parsing de JSON
// Necessário para processar requisições com body JSON (POST, PUT)
app.use(express.json());

// Importar e montar rotas
const authRouter = require('./src/routes/auth');
const usersRouter = require('./src/routes/users');

// Rotas públicas (autenticação)
app.use('/auth', authRouter);

// Rotas protegidas (usuários)
app.use('/users', usersRouter);

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