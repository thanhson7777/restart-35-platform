require('@babel/register');
const { adminAnalyticsService } = require('./src/services/adminAnalyticsService.js');
console.log('Loaded service', Object.keys(adminAnalyticsService));
