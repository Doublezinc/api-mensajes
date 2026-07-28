const mongoose = require('mongoose');
const dns = require('node:dns');

const connectDatabase = async () => {
  const uri = process.env.MONGODB_CNN;

  if (!uri) {
    console.warn('MONGODB_CNN no está configurado. La persistencia de reservas no estará disponible.');
    return false;
  }

  const dnsServers = (process.env.MONGODB_DNS_SERVERS || '')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);

  if (dnsServers.length > 0) {
    dns.setServers(dnsServers);
    console.log(`Resolución DNS de MongoDB usando: ${dnsServers.join(', ')}`);
  }

  await mongoose.connect(uri);
  console.log('Base de datos conectada');
  return true;
};

const databaseIsReady = () => mongoose.connection.readyState === 1;

module.exports = {
  connectDatabase,
  databaseIsReady
};
