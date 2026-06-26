import { GoogleProvider } from './src/providers/GoogleProvider.js';

async function test() {
  const startTime = Date.now() + 24 * 60 * 60 * 1000;
  const endTime = startTime + 60 * 60 * 1000;
  console.log("Testing createMeetLink...");
  const res = await GoogleProvider.createMeetLink(
    startTime,
    endTime,
    "Test Phỏng vấn",
    "Test Description",
    ["thanhson11052003@gmail.com"]
  );
  console.log("Result:", res);
}

test();
