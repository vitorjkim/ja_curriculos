// Helper to start the backend server on a specific port without relying on shell env syntax
const portArg = process.argv[2] || '3001';
process.env.PORT = String(portArg);
// Defer import so PORT is set before server reads it
import('./server.js');
