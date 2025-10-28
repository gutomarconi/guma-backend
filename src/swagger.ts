import path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';

// Registra ts-node para ler .ts
require('ts-node/register');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GUMA API',
      version: '1.0.0',
      description: 'API completa com CRUD para Companies, Users, Items, etc.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor local',
      },
    ],
    components: {
      schemas: {
        Company: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
            companyId: { type: 'integer', nullable: true },
          },
        },
        // Adicione outros schemas aqui se quiser mais detalhes
      },
    },
  },
  apis: [
    path.join(__dirname, 'routes/**/*.ts'),
  ],
};

export default swaggerJSDoc(options);