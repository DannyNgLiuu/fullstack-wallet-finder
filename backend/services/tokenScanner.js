import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TokenScanner {
  constructor(maxConcurrency = 1) {
    this.maxConcurrency = maxConcurrency;
    this.queue = [];
    this.running = 0;
  }

  async scanTokens(tokens, progressCallback, timePeriod) {
    return new Promise((resolve) => {
      const results = new Map();
      let completed = 0;
      const total = tokens.length;

      const processNext = () => {
        if (this.queue.length === 0 && this.running === 0) {
          // All done - convert Map to array
          const finalResults = Array.from(results.entries()).map(([token, wallets]) => ({
            token,
            wallets: wallets || []
          }));
          resolve(finalResults);
          return;
        }

        while (this.running < this.maxConcurrency && this.queue.length > 0) {
          const token = this.queue.shift();
          this.running++;

          this.scanSingleToken(token, timePeriod)
            .then(wallets => {
              results.set(token, wallets);
              completed++;
              
              progressCallback({
                type: 'token_complete',
                token,
                completed,
                total,
                walletCount: wallets.length
              });
            })
            .catch(error => {
              console.error(`Failed to scan ${token}:`, error);
              results.set(token, []);
              completed++;
              
              progressCallback({
                type: 'token_error',
                token,
                error: error.message,
                completed,
                total
              });
            })
            .finally(() => {
              this.running--;
              processNext();
            });
        }
      };

      // Add all tokens to queue
      this.queue = [...tokens];
      processNext();
    });
  }

  scanSingleToken(token, timePeriod) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, 'scraperWorker.js'), {
        workerData: { token, timePeriod }
      });

      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error(`Token ${token} scan timed out`));
      }, 70000); // 70 second timeout (10s buffer)

      worker.on('message', (result) => {
        clearTimeout(timeout);
        if (result.success) {
          resolve(result.wallets);
        } else {
          reject(new Error(result.error));
        }
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }
}

export default TokenScanner;