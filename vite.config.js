import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

const backupFile = path.resolve(__dirname, 'backup.json');

const localBackupPlugin = () => {
  return {
    name: 'local-backup',
    configureServer(server) {
      server.middlewares.use('/api/data', (req, res, next) => {
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          if (fs.existsSync(backupFile)) {
            const data = fs.readFileSync(backupFile, 'utf-8');
            res.end(data);
          } else {
            res.end(JSON.stringify({}));
          }
        } else if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              fs.writeFileSync(backupFile, body, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          next();
        }
      });
    }
  };
};

export default defineConfig({
  plugins: [localBackupPlugin()],
});
