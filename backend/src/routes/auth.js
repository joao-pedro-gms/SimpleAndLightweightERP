const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db, uuidv4 } = require('../db/localdb/database');

const SALT_ROUNDS = 10; // Número de rounds para bcrypt (10 é o padrão recomendado)

/**
 * POST /auth/register
 *
 * Registra um novo usuário no sistema.
 * - Hash da senha com bcrypt
 * - Cria usuário como não-admin por padrão
 * - Retorna token JWT automaticamente
 */
router.post('/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;

        // Validação
        if (!username || !password || !email) {
            return res.status(400).json({
                error: 'Campos obrigatórios faltando',
                details: 'username, password e email são obrigatórios'
            });
        }

        // Validação de senha forte (mínimo 8 caracteres)
        if (password.length < 8) {
            return res.status(400).json({
                error: 'Senha muito fraca',
                details: 'A senha deve ter no mínimo 8 caracteres'
            });
        }

        // Hash da senha
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        // Gera UUID
        const id = uuidv4();

        // Insere no banco
        const stmt = db.prepare(
            'INSERT INTO users (id, username, password_hash, email, is_admin) VALUES (?, ?, ?, ?, ?)'
        );
        stmt.run(id, username, password_hash, email, 0); // is_admin = 0 (false)

        // Gera token JWT
        const token = jwt.sign(
            { userId: id, username, email, is_admin: false },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        // Retorna token e informações do usuário
        res.status(201).json({
            message: 'Usuário criado com sucesso',
            token,
            user: {
                id,
                username,
                email,
                is_admin: false
            }
        });
    } catch (error) {
        if (error.code && error.code.includes('SQLITE_CONSTRAINT')) {
            return res.status(400).json({
                error: 'Email já está em uso',
                details: 'Um usuário com este email já existe no sistema'
            });
        }

        console.error('Erro ao registrar usuário:', error);
        res.status(500).json({ error: 'Erro ao registrar usuário' });
    }
});

/**
 * POST /auth/login
 *
 * Autentica um usuário e retorna token JWT.
 * - Busca usuário por email
 * - Compara senha com bcrypt
 * - Retorna token JWT
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validação
        if (!email || !password) {
            return res.status(400).json({
                error: 'Campos obrigatórios faltando',
                details: 'email e password são obrigatórios'
            });
        }

        // Busca usuário por email
        const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
        const user = stmt.get(email);

        // Mensagem genérica para não vazar informação sobre existência do email
        if (!user) {
            return res.status(401).json({
                error: 'Credenciais inválidas'
            });
        }

        // Compara senha
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({
                error: 'Credenciais inválidas'
            });
        }

        // Gera token JWT
        const token = jwt.sign(
            {
                userId: user.id,
                username: user.username,
                email: user.email,
                is_admin: Boolean(user.is_admin)
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        // Retorna token e informações do usuário
        res.status(200).json({
            message: 'Login realizado com sucesso',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                is_admin: Boolean(user.is_admin)
            }
        });
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});

module.exports = router;
