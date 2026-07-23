const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Пинг-хендлер для проверки работы сервера PWA-клиентом
app.get('/health', (req, res) => res.status(200).send('OK'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Хранилище подключенных пользователей: Map(username -> ws)
const clients = new Map();

wss.on('connection', (ws) => {
  let currentUser = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      // Регистрация клиента
      if (msg.type === 'register') {
        currentUser = msg.username.toLowerCase();
        clients.set(currentUser, ws);
        return;
      }

      // Пересылка зашифрованного сообщения или статуса
      if (msg.type === 'relay_signal') {
        const targetUser = msg.targetPeer.toLowerCase();
        const recipientSocket = clients.get(targetUser);

        if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
          recipientSocket.send(JSON.stringify(msg));
        }
      }
    } catch (e) {
      console.error('Ошибка обработки сообщения WS:', e);
    }
  });

  ws.on('close', () => {
    if (currentUser) clients.delete(currentUser);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Relay Server running on port ${PORT}`));
