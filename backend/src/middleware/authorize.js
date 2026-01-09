/**
 * MIDDLEWARE DE AUTORIZAÇÃO
 *
 * Verifica permissões baseadas em roles (admin) e ownership (dono do recurso).
 * Deve ser usado APÓS o middleware authenticateToken.
 */

/**
 * Verifica se o usuário é administrador
 *
 * @param {Request} req - Objeto de requisição Express (deve conter req.user)
 * @param {Response} res - Objeto de resposta Express
 * @param {Function} next - Função next do Express
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Autenticação necessária' });
    }

    if (!req.user.is_admin) {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }

    next();
};

/**
 * Verifica se o usuário é admin OU é o dono do recurso
 * Compara req.user.id com req.params.id
 *
 * @param {Request} req - Objeto de requisição Express (deve conter req.user e req.params.id)
 * @param {Response} res - Objeto de resposta Express
 * @param {Function} next - Função next do Express
 */
const requireAdminOrOwner = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Autenticação necessária' });
    }

    const isOwner = req.user.id === req.params.id;
    const isAdmin = req.user.is_admin;

    if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    next();
};

module.exports = { requireAdmin, requireAdminOrOwner };
