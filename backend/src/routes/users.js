/**
 * ROTAS DE USUÁRIOS (USERS ROUTES)
 *
 * Este arquivo define todas as rotas relacionadas ao recurso de usuários.
 * Utilizamos o Express Router para organizar as rotas de forma modular.
 *
 * O Express Router permite agrupar rotas relacionadas e aplicar middlewares
 * específicos apenas para este conjunto de rotas. Isso facilita a manutenção
 * e organização do código, separando as responsabilidades.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { db, uuidv4 } = require('../db/localdb/database');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin, requireAdminOrOwner } = require('../middleware/authorize');

const SALT_ROUNDS = 10; // Número de rounds para bcrypt

/**
 * GET /users
 *
 * Lista todos os usuários cadastrados no sistema.
 *
 * Fluxo de execução:
 * 1. Cliente faz requisição GET para /users
 * 2. Express chama esta função callback
 * 3. Preparamos uma query SQL usando db.prepare()
 * 4. Executamos a query com .all() que retorna array de resultados
 * 5. Mapeamos os resultados para remover password_hash (segurança)
 * 6. Retornamos JSON com array de usuários
 *
 * Métodos do better-sqlite3:
 * - prepare(): cria uma prepared statement (previne SQL injection)
 * - all(): executa a query e retorna todos os resultados em array
 *
 * Segurança: O campo password_hash é removido da resposta para evitar
 * exposição de informações sensíveis.
 */
router.get('/', authenticateToken, requireAdmin, (req, res) => {
    try {
        // Prepara a query SQL para buscar todos os usuários
        const stmt = db.prepare('SELECT * FROM users');

        // Executa a query e obtém todos os resultados
        const users = stmt.all();

        // Remove o campo password_hash de cada usuário por segurança
        // Nunca devemos expor senhas (mesmo em hash) nas respostas da API
        const usersWithoutPassword = users.map(({ password_hash, ...user }) => user);

        // Retorna os usuários como JSON com status 200 (OK)
        res.status(200).json(usersWithoutPassword);
    } catch (error) {
        // Em caso de erro no banco de dados, loga e retorna erro 500
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

/**
 * GET /users/:id
 *
 * Busca um usuário específico pelo ID.
 *
 * Parâmetros de rota:
 * - :id - UUID do usuário a ser buscado (vem na URL)
 *
 * Fluxo de execução:
 * 1. Extrai o ID dos parâmetros da rota (req.params.id)
 * 2. Prepara query SQL com placeholder (?) para o ID
 * 3. Executa a query com .get() que retorna um único resultado ou undefined
 * 4. Se encontrado, remove password_hash e retorna usuário
 * 5. Se não encontrado, retorna 404 (Not Found)
 *
 * Prepared statements: Usar placeholders (?) e passar valores separadamente
 * previne SQL injection, pois os valores são escapados automaticamente.
 */
router.get('/:id', authenticateToken, requireAdminOrOwner, (req, res) => {
    try {
        // Extrai o ID do usuário dos parâmetros da URL
        const { id } = req.params;

        // Prepara query com placeholder (?) - isso previne SQL injection
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');

        // Executa a query passando o ID como parâmetro
        // .get() retorna um único resultado ou undefined se não encontrar
        const user = stmt.get(id);

        // Verifica se o usuário foi encontrado
        if (!user) {
            // Retorna 404 (Not Found) se o usuário não existe
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Remove password_hash do objeto usando destructuring
        // A sintaxe { password_hash, ...user } separa password_hash do resto
        const { password_hash, ...userWithoutPassword } = user;

        // Retorna o usuário encontrado (sem a senha) com status 200 (OK)
        res.status(200).json(userWithoutPassword);
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
});

/**
 * POST /users
 *
 * Cria um novo usuário no sistema. (Apenas administradores)
 *
 * Body esperado (JSON):
 * {
 *   "username": "nome do usuário",
 *   "password": "senha em texto plano",
 *   "email": "email@exemplo.com"
 * }
 *
 * Validações:
 * - Todos os campos são obrigatórios
 * - Senha deve ter no mínimo 8 caracteres
 * - Email deve ser único (validado pelo banco de dados via constraint UNIQUE)
 *
 * Processo:
 * 1. Extrai os dados do corpo da requisição (req.body)
 * 2. Valida se todos os campos obrigatórios foram enviados
 * 3. Faz hash da senha com bcrypt (10 salt rounds)
 * 4. Gera um UUID único para o novo usuário usando uuidv4()
 * 5. Insere no banco de dados usando prepared statement
 * 6. Busca o usuário recém-criado para retornar os dados completos
 * 7. Retorna o usuário criado (sem password_hash) com status 201 (Created)
 *
 * Tratamento de erros:
 * - Se faltar campo obrigatório: retorna 400 (Bad Request)
 * - Se senha for muito curta: retorna 400 (Bad Request)
 * - Se email já existe: SQLite lança erro de constraint, tratamos e retornamos 400
 * - Se erro no banco: retorna 500 (Internal Server Error)
 *
 * UUID: Universally Unique Identifier - identificador único gerado
 * algoritmicamente, não requer coordenação centralizada.
 */
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Extrai os dados enviados no corpo da requisição
        const { username, password, email } = req.body;

        // Validação: verifica se todos os campos obrigatórios foram fornecidos
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

        // Faz hash da senha com bcrypt (segurança)
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        // Gera um UUID v4 (random) para o novo usuário
        // UUID formato: 550e8400-e29b-41d4-a716-446655440000
        const id = uuidv4();

        // Prepara query de inserção com placeholders para cada campo
        const stmt = db.prepare(
            'INSERT INTO users (id, username, password_hash, email) VALUES (?, ?, ?, ?)'
        );

        // Executa a inserção passando os valores
        // .run() retorna um objeto com informações sobre a operação
        stmt.run(id, username, password_hash, email);

        // Busca o usuário recém-criado para retornar os dados completos
        // (incluindo created_at que é gerado automaticamente pelo banco)
        const userStmt = db.prepare('SELECT * FROM users WHERE id = ?');
        const newUser = userStmt.get(id);

        // Remove password_hash antes de retornar
        const { password_hash: _, ...userWithoutPassword } = newUser;

        // Retorna 201 (Created) com o usuário criado
        // 201 indica que um novo recurso foi criado com sucesso
        res.status(201).json(userWithoutPassword);
    } catch (error) {
        // Trata erro específico de constraint UNIQUE (email duplicado)
        // SQLite retorna código que contém 'SQLITE_CONSTRAINT' quando uma constraint é violada
        if (error.code && error.code.includes('SQLITE_CONSTRAINT')) {
            return res.status(400).json({
                error: 'Email já está em uso',
                details: 'Um usuário com este email já existe no sistema'
            });
        }

        // Outros erros do banco de dados
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

/**
 * PUT /users/:id
 *
 * Atualiza um usuário existente. (Admin ou dono do perfil)
 *
 * Parâmetros de rota:
 * - :id - UUID do usuário a ser atualizado
 *
 * Body esperado (JSON) - campos opcionais, envia apenas o que deseja atualizar:
 * {
 *   "username": "novo nome",
 *   "password": "nova senha em texto plano",
 *   "email": "novoemail@exemplo.com"
 * }
 *
 * Funcionalidade:
 * - Permite atualização parcial (não precisa enviar todos os campos)
 * - Valida se o usuário existe antes de atualizar
 * - Faz hash da senha se fornecida
 * - Retorna os dados atualizados do usuário
 *
 * Processo:
 * 1. Verifica se o usuário existe
 * 2. Extrai os campos fornecidos do body
 * 3. Se senha fornecida, faz hash com bcrypt
 * 4. Constrói query SQL dinamicamente apenas com campos fornecidos
 * 5. Executa a atualização
 * 6. Busca e retorna o usuário atualizado
 *
 * Query dinâmica: Como permitimos atualização parcial, precisamos construir
 * a query SQL incluindo apenas os campos que foram fornecidos.
 */
router.put('/:id', authenticateToken, requireAdminOrOwner, async (req, res) => {
    try {
        const { id } = req.params;

        // Primeiro, verifica se o usuário existe
        const checkStmt = db.prepare('SELECT * FROM users WHERE id = ?');
        const existingUser = checkStmt.get(id);

        if (!existingUser) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Extrai os campos que podem ser atualizados do body
        const { username, password, email } = req.body;

        // Constrói a query de atualização dinamicamente
        // Apenas inclui campos que foram fornecidos na requisição
        const updates = [];
        const values = [];

        // Para cada campo fornecido, adiciona à query
        if (username !== undefined) {
            updates.push('username = ?');
            values.push(username);
        }
        if (password !== undefined) {
            // Faz hash da nova senha antes de atualizar
            const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
            updates.push('password_hash = ?');
            values.push(password_hash);
        }
        if (email !== undefined) {
            updates.push('email = ?');
            values.push(email);
        }

        // Se nenhum campo foi fornecido, retorna erro
        if (updates.length === 0) {
            return res.status(400).json({
                error: 'Nenhum campo para atualizar',
                details: 'Forneça ao menos um campo: username, password ou email'
            });
        }

        // Adiciona o ID ao final do array de valores (para a cláusula WHERE)
        values.push(id);

        // Monta a query final juntando todos os updates com vírgula
        // Exemplo: UPDATE users SET username = ?, email = ? WHERE id = ?
        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

        // Prepara e executa a query de atualização
        const stmt = db.prepare(query);
        stmt.run(...values); // Spread operator para passar array como argumentos individuais

        // Busca o usuário atualizado para retornar
        const updatedUserStmt = db.prepare('SELECT * FROM users WHERE id = ?');
        const updatedUser = updatedUserStmt.get(id);

        // Remove password_hash antes de retornar
        const { password_hash: _, ...userWithoutPassword } = updatedUser;

        // Retorna 200 (OK) com o usuário atualizado
        res.status(200).json(userWithoutPassword);
    } catch (error) {
        // Trata erro de email duplicado (constraint UNIQUE)
        if (error.code && error.code.includes('SQLITE_CONSTRAINT')) {
            return res.status(400).json({
                error: 'Email já está em uso',
                details: 'Um usuário com este email já existe no sistema'
            });
        }

        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});

/**
 * DELETE /users/:id
 *
 * Exclui um usuário do sistema. (Apenas administradores)
 *
 * Parâmetros de rota:
 * - :id - UUID do usuário a ser excluído
 *
 * Processo:
 * 1. Verifica se o usuário existe
 * 2. Se existe, executa a exclusão
 * 3. Retorna 204 (No Content) - indica sucesso sem corpo na resposta
 * 4. Se não existe, retorna 404 (Not Found)
 *
 * Status 204 (No Content):
 * - Indica que a operação foi bem-sucedida
 * - Não retorna corpo na resposta (apenas headers)
 * - É o padrão para operações DELETE bem-sucedidas em REST
 *
 * Importante: Sempre verificar se o recurso existe antes de tentar deletar,
 * para poder retornar o status HTTP apropriado (404 vs 204).
 */
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { id } = req.params;

        // Verifica se o usuário existe antes de tentar deletar
        const checkStmt = db.prepare('SELECT * FROM users WHERE id = ?');
        const existingUser = checkStmt.get(id);

        if (!existingUser) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Prepara e executa a query de exclusão
        const stmt = db.prepare('DELETE FROM users WHERE id = ?');
        stmt.run(id);

        // Retorna 204 (No Content)
        // Não enviamos corpo na resposta, apenas o status code
        // res.send() sem argumentos envia resposta vazia
        res.status(204).send();
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
});

/**
 * EXPORTAÇÃO DO ROUTER
 *
 * O router é exportado para ser importado e usado no arquivo principal (index.js).
 * Lá ele será "montado" em um caminho específico usando app.use('/users', usersRouter).
 *
 * Isso faz com que todas as rotas definidas aqui fiquem acessíveis sob /users:
 * - GET /users           -> lista todos
 * - GET /users/:id       -> busca por ID
 * - POST /users          -> cria novo
 * - PUT /users/:id       -> atualiza
 * - DELETE /users/:id    -> exclui
 */
module.exports = router;
