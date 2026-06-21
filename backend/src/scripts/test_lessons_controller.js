const { courseController } = require('../controllers/courseController');
const { CONNECT_DB } = require('../config/mongodb');

async function testController() {
  try {
    await CONNECT_DB();
    console.log('✅ Connected to MongoDB');

    const req = {
      params: {
        id: '6a354bc3e54d8a6696dee0b3'
      }
    };

    const res = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        console.log('API Response status:', this.statusCode);
        console.log('API Response data:', JSON.stringify(data, null, 2));
      }
    };

    const next = (err) => {
      console.error('Next called with error:', err);
    };

    await courseController.getCourseLessons(req, res, next);

  } catch (error) {
    console.error('Test error:', error);
  }
}

testController();
