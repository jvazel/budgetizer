import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Budgetizer API Documentation',
      version: '1.0.0',
      description: 'Documentation interactive de l\'API Budgetizer. Permet de gérer ses comptes, transactions, budgets, rapports mensuels, ainsi que l\'authentification sécurisée (y compris WebAuthn / Passkeys).',
      contact: {
        name: 'Budgetizer Team',
        email: 'johann.vazel@gmail.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Serveur de Développement Local',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Veuillez saisir votre token JWT sous le format: `Bearer <votre_token>`',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Scans for annotations in routes files relative to the server execution directory
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

// Premium Dark Theme styling for Swagger UI
export const customCss = `
  body {
    margin: 0;
    background-color: #0b0f19 !important;
  }
  .swagger-ui {
    background-color: #0b0f19 !important;
    color: #e2e8f0 !important;
    font-family: 'Outfit', 'Inter', sans-serif !important;
  }
  .swagger-ui .topbar {
    background-color: #0f172a !important;
    border-bottom: 2px solid #4f46e5 !important;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2) !important;
  }
  .swagger-ui .topbar a {
    color: #ffffff !important;
    font-weight: 700 !important;
  }
  .swagger-ui .info {
    margin: 30px 0 !important;
  }
  .swagger-ui .info .title {
    color: #ffffff !important;
    font-size: 2.2rem !important;
    font-weight: 800 !important;
  }
  .swagger-ui .info p, .swagger-ui .info li, .swagger-ui .info td {
    color: #94a3b8 !important;
  }
  .swagger-ui .scheme-container {
    background-color: #0f172a !important;
    box-shadow: none !important;
    border: 1px solid #1e293b !important;
    border-radius: 12px !important;
    padding: 15px !important;
  }
  .swagger-ui select {
    background-color: #1e293b !important;
    color: #ffffff !important;
    border: 1px solid #334155 !important;
    border-radius: 6px !important;
    padding: 6px 10px !important;
  }
  .swagger-ui .opblock {
    border-radius: 12px !important;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
    border: 1px solid #1e293b !important;
    background-color: #0f172a !important;
    margin-bottom: 12px !important;
  }
  .swagger-ui .opblock .opblock-summary {
    padding: 12px 20px !important;
  }
  
  .swagger-ui .opblock.opblock-get { background: rgba(59, 130, 246, 0.05) !important; border-color: rgba(59, 130, 246, 0.2) !important; }
  .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #3b82f6 !important; border-radius: 6px !important; }
  
  .swagger-ui .opblock.opblock-post { background: rgba(16, 185, 129, 0.05) !important; border-color: rgba(16, 185, 129, 0.2) !important; }
  .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #10b981 !important; border-radius: 6px !important; }
  
  .swagger-ui .opblock.opblock-put { background: rgba(245, 158, 11, 0.05) !important; border-color: rgba(245, 158, 11, 0.2) !important; }
  .swagger-ui .opblock.opblock-put .opblock-summary-method { background: #f59e0b !important; border-radius: 6px !important; }
  
  .swagger-ui .opblock.opblock-delete { background: rgba(239, 68, 68, 0.05) !important; border-color: rgba(239, 68, 68, 0.2) !important; }
  .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #ef4444 !important; border-radius: 6px !important; }
  
  .swagger-ui .opblock.opblock-patch { background: rgba(139, 92, 246, 0.05) !important; border-color: rgba(139, 92, 246, 0.2) !important; }
  .swagger-ui .opblock.opblock-patch .opblock-summary-method { background: #8b5cf6 !important; border-radius: 6px !important; }

  .swagger-ui .opblock-summary-path {
    color: #f1f5f9 !important;
    font-weight: 600 !important;
    font-family: monospace !important;
  }
  .swagger-ui .opblock-summary-description {
    color: #94a3b8 !important;
  }
  .swagger-ui .tabli button {
    color: #94a3b8 !important;
    font-weight: 600 !important;
  }
  .swagger-ui .tabli.active button {
    color: #ffffff !important;
    border-bottom-color: #4f46e5 !important;
  }
  .swagger-ui .btn.authorize {
    border-color: #10b981 !important;
    color: #10b981 !important;
    background-color: transparent !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
  }
  .swagger-ui .btn.authorize:hover {
    background-color: rgba(16, 185, 129, 0.1) !important;
  }
  .swagger-ui .btn.authorize svg {
    fill: #10b981 !important;
  }
  .swagger-ui .btn {
    border-radius: 8px !important;
    color: #cbd5e1 !important;
    border-color: #475569 !important;
    background-color: #1e293b !important;
  }
  .swagger-ui .btn:hover {
    background-color: #334155 !important;
  }
  .swagger-ui .dialog-ux .modal-ux {
    background-color: #0f172a !important;
    border: 1px solid #1e293b !important;
    border-radius: 16px !important;
  }
  .swagger-ui .dialog-ux .modal-ux-header h3 {
    color: #ffffff !important;
  }
  .swagger-ui .dialog-ux .modal-ux-content {
    color: #cbd5e1 !important;
  }
  .swagger-ui .dialog-ux .modal-ux-header .close-modal {
    fill: #94a3b8 !important;
  }
  .swagger-ui input[type=text] {
    background-color: #1e293b !important;
    color: #ffffff !important;
    border: 1px solid #334155 !important;
    border-radius: 6px !important;
    padding: 8px 12px !important;
  }
  .swagger-ui .response-col_status {
    color: #ffffff !important;
    font-weight: 700 !important;
  }
  .swagger-ui table thead tr td, .swagger-ui table thead tr th {
    color: #ffffff !important;
    border-bottom: 1px solid #1e293b !important;
  }
  .swagger-ui .response-col_links {
    color: #94a3b8 !important;
  }
  .swagger-ui .parameter__name {
    color: #ffffff !important;
    font-weight: 600 !important;
  }
  .swagger-ui .parameter__type {
    color: #8b5cf6 !important;
  }
  .swagger-ui .parameter__in {
    color: #94a3b8 !important;
  }
  .swagger-ui .model-box {
    background-color: #1e293b !important;
    border-radius: 8px !important;
    padding: 12px !important;
    border: 1px solid #334155 !important;
  }
  .swagger-ui section.models {
    border: 1px solid #1e293b !important;
    border-radius: 12px !important;
    background-color: #0f172a !important;
  }
  .swagger-ui section.models h4 {
    color: #ffffff !important;
    border-bottom: 1px solid #1e293b !important;
    font-weight: 700 !important;
  }
  .swagger-ui .model-title {
    color: #ffffff !important;
  }
  .swagger-ui .model {
    color: #cbd5e1 !important;
  }
  .swagger-ui .model-toggle:after {
    filter: invert(1) !important;
  }
  .swagger-ui .renderedMarkdown p {
    color: #94a3b8 !important;
  }
  .swagger-ui .prop-type {
    color: #8b5cf6 !important;
  }
  .swagger-ui .prop-format {
    color: #64748b !important;
  }
`;

export default swaggerSpec;
