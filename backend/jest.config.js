/**
 * Configuração do Jest
 *
 * Este arquivo configura o Jest para lidar com módulos ES modules (como uuid v13)
 * em um projeto que usa CommonJS.
 */

module.exports = {
    // Ambiente de teste Node.js (default, mas explícito)
    testEnvironment: 'node',

    // Não transforma arquivos em node_modules EXCETO o uuid
    // O uuid v13+ usa ES modules, então precisamos transformá-lo
    transformIgnorePatterns: [
        'node_modules/(?!(uuid)/)'
    ],

    // Extensões de arquivo para processar
    moduleFileExtensions: ['js', 'json'],

    // Padrão para encontrar arquivos de teste
    testMatch: [
        '**/__tests__/**/*.js',
        '**/?(*.)+(spec|test).js'
    ]
};
