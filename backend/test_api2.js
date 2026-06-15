import axios from 'axios';
async function run() {
  try {
    const loginRes = await axios.post('http://localhost:8017/v1/auth/login', {
      email: 'thanhson11052003@gmail.com', password: '1'
    });
    const token = loginRes.data.data.accessToken;
    const res = await axios.get('http://localhost:8017/v1/courses/admin/all', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(JSON.stringify(res.data.data.courses.map(c => ({ title: c.title, category: c.category })).slice(0, 3), null, 2));
  } catch (err) {
    console.log(err.response?.data || err.message);
  }
}
run();
