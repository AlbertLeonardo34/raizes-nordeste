import 'dotenv/config';
import { app } from './app';
import { logger } from './infrastructure/logging/logger';
import { prisma } from './infrastructure/database/prisma/client';

const PORT = process.env.PORT || 3000;

async function main() {
  try {
    // Verifica conexão com o banco
    await prisma.$connect();
    logger.info('✅ Conectado ao banco de dados PostgreSQL');

    app.listen(PORT, () => {
      logger.info(`🚀 Raízes do Nordeste API rodando na porta ${PORT}`);
      logger.info(`📚 Swagger disponível em: http://localhost:${PORT}/api/docs`);
      logger.info(`🔧 Health check: http://localhost:${PORT}/health`);
    });
  } catch (err) {
    logger.error('❌ Falha ao iniciar servidor', { err });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Encerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

main();
