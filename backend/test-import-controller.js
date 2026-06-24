require('@babel/register');
const { adminAnalyticsController } = require('./src/controllers/adminAnalyticsController.js');
console.log('Loaded controller', Object.keys(adminAnalyticsController));
