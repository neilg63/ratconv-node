const app = require('./app');
const config = require('./.env');

app.listen(config.port, () => {
  console.log(`Running on port ${config.port}`)
});