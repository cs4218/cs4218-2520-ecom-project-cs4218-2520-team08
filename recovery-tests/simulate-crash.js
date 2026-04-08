// Shivangi Kamat, A0319665R
const { execSync } = require('child_process');

try {
  console.log("Simulating unexpected server crash for recovery test...");
  console.log("Locating process on port 6060 (E-commerce backend)...");
  
  const output = execSync("lsof -t -i:6060 -sTCP:LISTEN").toString().trim();
  
  if (output) {
    const pids = output.split('\n');
    console.log(`Found processes: ${pids.join(', ')}. Terminating...`);
    pids.forEach(pid => {
        try {
            process.kill(pid, 'SIGKILL');
            console.log(`Successfully killed process ${pid}`);
        } catch (killErr) {
            console.log(`Could not kill process ${pid}: ${killErr.message}`);
        }
    });

    console.log("Waiting 5 seconds before triggering a server restart...");
    // nodemon waits for file changes to restart a crashed app, so we touch a file
    setTimeout(() => {
        console.log("Touching server.js to force nodemon restart...");
        execSync("touch server.js");
    }, 5000);
  } else {
    console.log("No process found on port 6060.");
  }
} catch (error) {
  console.log("No server process found or error occurred: ", error.message);
}
