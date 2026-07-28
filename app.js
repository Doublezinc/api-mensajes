require('dotenv').config();
const Server = require('./models/server');

const server = new Server();

server.listen().catch((error) => {
  console.error('No fue posible iniciar el servidor:', error);
  process.exitCode = 1;
});
