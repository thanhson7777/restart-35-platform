import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('http://localhost:8000/v1/courses/6a354bc3e54d8a6696dee0b3/lessons');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}

test();
