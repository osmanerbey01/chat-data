const WebSocket = require("ws");
const express = require("express");
const http = require("http");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Statik dosyaları public klasöründen sun
app.use(express.static(path.join(__dirname, "public")));

const clients = new Map(); // ws => username
const botName = "Asra2Bot";
const mutedUsers = new Set();

function isAdmin(username) {
  return username && username.includes("[YETKILI]");
}

function getWsByUsername(username) {
  for (const [ws, name] of clients.entries()) {
    if (name === username) return ws;
  }
  return null;
}

function broadcastActiveUsers() {
  const activeUsers = Array.from(clients.values());
  const message = JSON.stringify({
    type: "activeUsers",
    users: activeUsers,
  });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

if (data.type === "join") {
  // Aynı isimde kullanıcı var mı kontrol et
  const nameAlreadyTaken = Array.from(clients.values()).includes(data.name);
  if (nameAlreadyTaken) {
    ws.send(JSON.stringify({
      type: "error",
      reason: "Bu kullanıcı adı zaten kullanılıyor."
    }));
    return;
  }

  // Kullanıcıyı kaydet
  clients.set(ws, data.name);
  
  const joinMsg = JSON.stringify({
    type: "join",
    name: data.name,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(joinMsg);
    }
  });

  broadcastActiveUsers();
}

if (data.type === "message") {
  // E?er kullanıcı susturulmu?sa mesajı yayma
  if (mutedUsers.has(data.name)) {
    // İstersen susturuldu mesajı gönderebilirsin
    ws.send(JSON.stringify({
      type: "system",
      text: "Susturuldunuz, mesaj gönderemezsiniz."
    }));
    return;
  }

  if (data.text.startsWith("/")) {
    handleBotCommand(data.text, data.name);
    return;
  }

  const chatMsg = JSON.stringify({
    type: "message",
    name: data.name,
    text: data.text,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(chatMsg);
    }
  });
}

    else if (data.type === "image") {
      const imageMsg = JSON.stringify({
        type: "image",
        name: data.name,
        image: data.image,
      });

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(imageMsg);
        }
      });
    }

    else if (data.type === "kick") {
      if (!isAdmin(clients.get(ws))) return;

      const targetUser = data.target;
      const targetWs = getWsByUsername(targetUser);
      if (targetWs) {
        targetWs.send(JSON.stringify({
          type: "kick",
          reason: "Yetkili tarafından atıldınız."
        }));
        targetWs.close();
      }
    }
  });

  ws.on("close", () => {
    const username = clients.get(ws);
    clients.delete(ws);

    if (username) {
      const leaveMsg = JSON.stringify({
        type: "leave",
        name: username,
      });

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(leaveMsg);
        }
      });

      broadcastActiveUsers();
    }
  });
});

// BOT FONKSİYONU
function handleBotCommand(text, fromUser) {
  let response = "";

  // Yaln?zca yetkililer /mute ve /unmute kullanabilir
  if (text.startsWith("/mute ")) {
    if (!isAdmin(fromUser)) {
      response = "Bu komutu kullanmak icin yetkiniz yok.";
    } else {
      const usernameToMute = text.split(" ")[1];
      mutedUsers.add(usernameToMute);
      response = `${usernameToMute} susturuldu.`;
    }
  } else if (text.startsWith("/unmute ")) {
    if (!isAdmin(fromUser)) {
      response = "Bu komutu kullanmak icin yetkiniz yok.";
    } else {
      const usernameToUnmute = text.split(" ")[1];
      mutedUsers.delete(usernameToUnmute);
      response = `${usernameToUnmute} susturulmas? kald?r?ld?.`;
    }
  } else if (text === "/yard?m") {
    response = "Komutlar: /selam, /hava, /yard?m, /komik";
  } else if (text === "/selam") {
    response = `Selam ${fromUser}, nas?ls?n? ??`;
  } else if (text === "/hava") {
    response = "?u an hava gune?li ?? (bu sabit, istersen gercek hava durumu ekleyebiliriz!)";
  } else if (text === "/komik") {
    response = "Neden bilgisayar asla susmaz? Cunku hep i?lem yapar! ??";
  } else {
    response = "Bilinmeyen komut. Yard?m icin: /yard?m";
  }

  const botMsg = JSON.stringify({
    type: "message",
    name: botName,
    text: response,
    avatar: "https://cdn-icons-png.flaticon.com/512/4712/4712027.png"
  });

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(botMsg);
    }
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde calisiyor.`);
});
