const app = require('./app');
const { connectDB } = require('./config/database');
const config = require('./config/env');

const startServer = async () => {
  await connectDB();

  const server = app.listen(config.port, () => {
    console.log(`🚀 Server running in ${config.nodeEnv} mode on port ${config.port}`);
    console.log(`📋 Health check: http://localhost:${config.port}/health`);
    console.log(`🔗 API base:     http://localhost:${config.port}/api`);
  });

  // Graceful shutdown on termination signals
  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      const { disconnectDB } = require('./config/database');
      await disconnectDB();
      console.log('✅ Server closed cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Catch unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('🔥 Unhandled Rejection:', err.message);
    server.close(() => process.exit(1));
  });
};

startServer();
