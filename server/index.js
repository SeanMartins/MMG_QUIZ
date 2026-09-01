import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import quizRoutes from './quiz-routes.js';
import publicRoutes from './public-routes.js';
import { attachGameHandlers } from './game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api', publicRoutes);
app.use('/api', quizRoutes);

app.get('/api/network-info', (req, res) => {
  res.json({ localIp: getLocalIp(), port: PORT });
});

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
attachGameHandlers(io);

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

httpServer.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIp();
  console.log(`\nQuiz server avviato!`);
  console.log(`  Locale:      http://localhost:${PORT}`);
  console.log(`  Rete Wi-Fi:  http://${ip}:${PORT}\n`);
});
