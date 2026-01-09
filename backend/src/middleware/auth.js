const jwt = require('jsonwebtoken');
const { db } = require('../db/localdb/database');

/**
 * MIDDLEWARE DE AUTENTICAÇÃO JWT
 *
 * Verifica se o token JWT é válido e extrai informações do usuário.
 * Adiciona req.user ao objeto de requisição para uso em rotas protegidas.
 *
 * @param {Request} req - Objeto de requisição Express
 * @param {Response} res - Objeto de resposta Express
 * @param {Function} next - Função next do Express
 */
const authenticateToken = (req, res, next) => {
    try {
        // Extrai o token do header Authorization
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }

        // Verifica e decodifica o token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Busca o usuário no banco para confirmar que ainda existe
        const stmt = db.prepare('SELECT id, username, email, is_admin FROM users WHERE id = ?');
        const user = stmt.get(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'Usuário não encontrado' });
        }

        // Adiciona informações do usuário ao request
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ error: 'Token inválido' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Token expirado' });
        }
        return res.status(500).json({ error: 'Erro ao verificar token' });
    }
};

module.exports = { authenticateToken };
