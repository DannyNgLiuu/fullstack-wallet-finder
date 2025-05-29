import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!isMainThread) {
  const { token } = workerData;
  
  const pythonScript = path.join(__dirname, '../scripts/scrape_token.py');
  const process = spawn('py', [pythonScript, token]);
  
  let output = '';
  let errorOutput = '';
  
  process.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  process.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });
  
  process.on('close', (code) => {
    if (code === 0) {
      try {
        const wallets = JSON.parse(output.trim());
        parentPort.postMessage({ success: true, wallets });
      } catch (error) {
        parentPort.postMessage({ 
          success: false, 
          error: `Failed to parse output: ${error.message}` 
        });
      }
    } else {
      parentPort.postMessage({ 
        success: false, 
        error: `Python script failed with code ${code}: ${errorOutput}` 
      });
    }
  });
  
  // Handle timeout
  setTimeout(() => {
    process.kill();
    parentPort.postMessage({ 
      success: false, 
      error: 'Script timed out after 120 seconds' 
    });
  }, 120000);
}