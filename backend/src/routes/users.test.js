/**
 * TESTES DA API DE USUÁRIOS
 *
 * Este arquivo contém todos os testes para a API de usuários (CRUD completo).
 * Usamos Jest como framework de testes e Supertest para testar endpoints HTTP.
 *
 * Estratégia de testes:
 * - beforeEach: limpa a tabela users antes de cada teste (isolamento)
 * - Testa cenários de sucesso e erro para cada endpoint
 * - Verifica status HTTP, estrutura de resposta e dados retornados
 */

const request = require('supertest');
const app = require('../../index');
const { db } = require('../db/localdb/database');

describe('Users CRUD API', () => {
    /**
     * beforeEach: Executado antes de cada teste
     * Limpa todos os usuários da tabela para garantir isolamento entre testes.
     * Cada teste começa com o banco limpo, evitando interferências.
     */
    beforeEach(() => {
        db.prepare('DELETE FROM users').run();
    });

    /**
     * TESTES: GET /users
     * Endpoint que lista todos os usuários
     */
    describe('GET /users', () => {
        it('deve retornar array vazio quando não há usuários', async () => {
            const response = await request(app).get('/users');

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
            expect(Array.isArray(response.body)).toBe(true);
        });

        it('deve retornar todos os usuários cadastrados', async () => {
            // Primeiro, cria alguns usuários diretamente no banco para testar
            const stmt = db.prepare(
                'INSERT INTO users (id, username, password_hash, email, is_admin) VALUES (?, ?, ?, ?, ?)'
            );
            stmt.run('id-1', 'usuario1', 'hash1', 'usuario1@example.com', 0);
            stmt.run('id-2', 'usuario2', 'hash2', 'usuario2@example.com', 0);

            const response = await request(app).get('/users');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].username).toBe('usuario1');
            expect(response.body[1].username).toBe('usuario2');
        });

        it('não deve incluir password_hash na resposta', async () => {
            // Cria um usuário
            const stmt = db.prepare(
                'INSERT INTO users (id, username, password_hash, email, is_admin) VALUES (?, ?, ?, ?, ?)'
            );
            stmt.run('id-1', 'usuario1', 'hash_secreto', 'usuario1@example.com', 0);

            const response = await request(app).get('/users');

            expect(response.status).toBe(200);
            expect(response.body[0]).not.toHaveProperty('password_hash');
            expect(response.body[0]).toHaveProperty('id');
            expect(response.body[0]).toHaveProperty('username');
            expect(response.body[0]).toHaveProperty('email');
        });
    });

    /**
     * TESTES: GET /users/:id
     * Endpoint que busca um usuário específico por ID
     */
    describe('GET /users/:id', () => {
        it('deve retornar usuário específico por ID válido', async () => {
            // Cria um usuário
            const stmt = db.prepare(
                'INSERT INTO users (id, username, password_hash, email, is_admin) VALUES (?, ?, ?, ?, ?)'
            );
            stmt.run('id-teste', 'usuario_teste', 'hash123', 'teste@example.com', 0);

            const response = await request(app).get('/users/id-teste');

            expect(response.status).toBe(200);
            expect(response.body.id).toBe('id-teste');
            expect(response.body.username).toBe('usuario_teste');
            expect(response.body.email).toBe('teste@example.com');
        });

        it('deve retornar 404 para ID inexistente', async () => {
            const response = await request(app).get('/users/id-inexistente');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Usuário não encontrado');
        });

        it('não deve incluir password_hash na resposta', async () => {
            // Cria um usuário
            const stmt = db.prepare(
                'INSERT INTO users (id, username, password_hash, email, is_admin) VALUES (?, ?, ?, ?, ?)'
            );
            stmt.run('id-teste', 'usuario_teste', 'hash_secreto', 'teste@example.com', 0);

            const response = await request(app).get('/users/id-teste');

            expect(response.status).toBe(200);
            expect(response.body).not.toHaveProperty('password_hash');
        });
    });

    /**
     * TESTES: POST /users
     * Endpoint que cria novos usuários
     */
    describe('POST /users', () => {
        it('deve criar usuário com dados válidos', async () => {
            const userData = {
                username: 'novo_usuario',
                password_hash: 'hash_senha',
                email: 'novo@example.com'
            };

            const response = await request(app)
                .post('/users')
                .send(userData);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.username).toBe('novo_usuario');
            expect(response.body.email).toBe('novo@example.com');
            expect(response.body).toHaveProperty('created_at');
        });

        it('deve gerar UUID automaticamente', async () => {
            const userData = {
                username: 'usuario_uuid',
                password_hash: 'hash123',
                email: 'uuid@example.com'
            };

            const response = await request(app)
                .post('/users')
                .send(userData);

            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(typeof response.body.id).toBe('string');
            expect(response.body.id.length).toBeGreaterThan(0);
            // Verifica formato UUID (aproximado)
            expect(response.body.id).toMatch(/^[0-9a-f-]+$/i);
        });

        it('não deve incluir password_hash na resposta', async () => {
            const userData = {
                username: 'usuario_seguro',
                password_hash: 'hash_super_secreto',
                email: 'seguro@example.com'
            };

            const response = await request(app)
                .post('/users')
                .send(userData);

            expect(response.status).toBe(201);
            expect(response.body).not.toHaveProperty('password_hash');
        });

        it('deve retornar 400 quando falta username', async () => {
            const userData = {
                password_hash: 'hash123',
                email: 'teste@example.com'
            };

            const response = await request(app)
                .post('/users')
                .send(userData);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('obrigatórios');
        });

        it('deve retornar 400 quando falta password_hash', async () => {
            const userData = {
                username: 'usuario',
                email: 'teste@example.com'
            };

            const response = await request(app)
                .post('/users')
                .send(userData);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('deve retornar 400 quando falta email', async () => {
            const userData = {
                username: 'usuario',
                password_hash: 'hash123'
            };

            const response = await request(app)
                .post('/users')
                .send(userData);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('deve retornar erro para email duplicado', async () => {
            const userData = {
                username: 'usuario1',
                password_hash: 'hash1',
                email: 'duplicado@example.com'
            };

            // Primeiro POST - deve ter sucesso
            await request(app).post('/users').send(userData);

            // Segundo POST com mesmo email - deve falhar
            const response = await request(app)
                .post('/users')
                .send({
                    username: 'usuario2',
                    password_hash: 'hash2',
                    email: 'duplicado@example.com'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Email já está em uso');
        });
    });

    /**
     * TESTES: PUT /users/:id
     * Endpoint que atualiza usuários existentes
     */
    describe('PUT /users/:id', () => {
        it('deve atualizar usuário com dados válidos', async () => {
            // Primeiro cria um usuário
            const stmt = db.prepare(
                'INSERT INTO users (id, username, password_hash, email, is_admin) VALUES (?, ?, ?, ?, ?)'
            );
            stmt.run('id-update', 'usuario_antigo', 'hash_antigo', 'antigo@example.com', 0);

            // Atualiza o usuário
            const response = await request(app)
                .put('/users/id-update')
                .send({
                    username: 'usuario_novo',
                    email: 'novo@example.com'
                });

            expect(response.status).toBe(200);
            expect(response.body.username).toBe('usuario_novo');
            expect(response.body.email).toBe('novo@example.com');
        });

        it('deve permitir atualização parcial (apenas username)', async () => {
            // Cria um usuário
            const stmt = db.prepare(
                'INSERT INTO users (id, username, password_hash, email, is_admin) VALUES (?, ?, ?, ?, ?)'
            );
            stmt.run('id-partial', 'username_antigo', 'hash123', 'email@example.com', 0);

            // Atualiza apenas o username
            const response = await request(app)
                .put('/users/id-partial')
                .send({ username: 'username_novo' });

            expect(response.status).toBe(200);
            expect(response.body.username).toBe('username_novo');
            expect(response.body.email).toBe('email@example.com'); // Email não mudou
        });

        it('deve permitir atualização parcial (apenas email)', async () => {
            // Cria um usuário
            const stmt = db.prepare(
                'INSERT INTO users (id, username, password_hash, email, is_admin) VALUES (?, ?, ?, ?, ?)'
            );
            stmt.run('id-email', 'usuario', 'hash123', 'antigo@example.com', 0);

            // Atualiza apenas o email
            const response = await request(app)
                .put('/users/id-email')
                .send({ email: 'novo@example.com' });

            expect(response.status).toBe(200);
            expect(response.body.username).toBe('usuario'); // Username não mudou
            expect(response.body.email).toBe('novo@example.com');
        });

        it('deve retornar 404 para usuário inexistente', async () => {
            const response = await request(app)
                .put('/users/id-inexistente')
                .send({ username: 'novo_nome' });

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Usuário não encontrado');
        });

        it('deve retornar erro para email duplicado', async () => {
            // Cria dois usuários
            const stmt = db.prepare(
                'INSERT INTO users (id, username, password_hash, email, is_admin) VALUES (?, ?, ?, ?, ?)'
            );
            stmt.run('id-1', 'usuario1', 'hash1', 'email1@example.com', 0);
            stmt.run('id-2', 'usuario2', 'hash2', 'email2@example.com', 0);

            // Tenta atualizar usuario2 para ter o mesmo email do usuario1
            const response = await request(app)
                .put('/users/id-2')
                .send({ email: 'email1@example.com' });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Email já está em uso');
        });

        it('deve retornar 400 quando nenhum campo é fornecido', async () => {
            // Cria um usuário
            const stmt = db.prepare(
                'INSERT INTO users (id, username, password_hash, email, is_admin) VALUES (?, ?, ?, ?, ?)'
            );
            stmt.run('id-empty', 'usuario', 'hash123', 'email@example.com', 0);

            // Tenta atualizar sem fornecer campos
            const response = await request(app)
                .put('/users/id-empty')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Nenhum campo para atualizar');
        });

        it('não deve incluir password_hash na resposta', async () => {
            // Cria um usuário
            const stmt = db.prepare(
                'INSERT INTO users (id, username, password_hash, email) VALUES (?, ?, ?, ?)'
            );
            stmt.run('id-pass', 'usuario', 'hash_secreto', 'email@example.com');

            const response = await request(app)
                .put('/users/id-pass')
                .send({ username: 'novo_nome' });

            expect(response.status).toBe(200);
            expect(response.body).not.toHaveProperty('password_hash');
        });
    });

    /**
     * TESTES: DELETE /users/:id
     * Endpoint que exclui usuários
     */
    describe('DELETE /users/:id', () => {
        it('deve excluir usuário existente', async () => {
            // Cria um usuário
            const stmt = db.prepare(
                'INSERT INTO users (id, username, password_hash, email) VALUES (?, ?, ?, ?)'
            );
            stmt.run('id-delete', 'usuario_delete', 'hash123', 'delete@example.com');

            // Exclui o usuário
            const response = await request(app).delete('/users/id-delete');

            expect(response.status).toBe(204);
            // Status 204 não retorna body, então não verificamos response.body
        });

        it('deve retornar 404 para usuário inexistente', async () => {
            const response = await request(app).delete('/users/id-inexistente');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Usuário não encontrado');
        });

        it('deve confirmar que usuário foi realmente excluído', async () => {
            // Cria um usuário
            const stmt = db.prepare(
                'INSERT INTO users (id, username, password_hash, email, is_admin) VALUES (?, ?, ?, ?, ?)'
            );
            stmt.run('id-confirm', 'usuario', 'hash123', 'email@example.com', 0);

            // Exclui
            await request(app).delete('/users/id-confirm');

            // Tenta buscar - deve retornar 404
            const getResponse = await request(app).get('/users/id-confirm');
            expect(getResponse.status).toBe(404);
        });

        it('deve permitir excluir e recriar usuário com mesmo email', async () => {
            const userData = {
                username: 'usuario',
                password_hash: 'hash123',
                email: 'reutilizavel@example.com'
            };

            // Cria usuário
            const createResponse1 = await request(app)
                .post('/users')
                .send(userData);
            const userId = createResponse1.body.id;

            // Exclui
            await request(app).delete(`/users/${userId}`);

            // Recria com mesmo email - deve funcionar
            const createResponse2 = await request(app)
                .post('/users')
                .send(userData);

            expect(createResponse2.status).toBe(201);
            expect(createResponse2.body.email).toBe('reutilizavel@example.com');
        });
    });
});
