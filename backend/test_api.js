import axios from 'axios';

async function run() {
  try {
    const loginRes = await axios.post('http://localhost:8000/v1/auth/login', {
      email: 'thanhson11052003@gmail.com', // Admin email
      password: '1'
    });
    
    const token = loginRes.data.data.accessToken;
    
    const res = await axios.get('http://localhost:8000/v1/courses/admin/all', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(JSON.stringify(res.data.data.courses.map(c => c.category).slice(0, 5), null, 2));
  } catch (err) {
    console.log(err.response?.data || err.message);
  }
}
run();
