// E2E test environment variables
// Overrides config defaults to use isolated test databases
process.env.NODE_ENV = 'test';
process.env.DB_DATABASE = 'learniverse_test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/learniverse_test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
