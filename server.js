require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, () => {
  console.log(`TripMaster Server running on http://${HOST}:${PORT}`);
  console.log('Apifox OpenAPI spec available at /api/openapi.json');
});
