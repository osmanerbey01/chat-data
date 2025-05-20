const socket = new WebSocket('ws://localhost:3000');

const loginScreen = document.getElementById('loginScreen');
const chatScreen = document.getElementById('chatScreen');
const activeUsersContainer = document.getElementById('activeUsersContainer');

const usernameInput = document.getElementById('usernameInput');
const loginButton = document.getElementById('loginButton');

const messagesDiv = document.getElementById('chatMessages');
const input = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const imageInput = document.getElementById('imageInput');

const activeUsersList = document.getElementById('activeUsersList');

let username = "";

// Giriş yap butonu tıklanınca
loginButton.addEventListener('click', () => {
  const name = usernameInput.value.trim();
  if (name === "") {
    showToast("Lütfen isminizi girin!", "warning");
    return;
  }
  username = name;

  socket.send(JSON.stringify({
    type: 'join',
    name: username,
  }));

  loginScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  activeUsersContainer.classList.remove('hidden');

  input.focus();
});

// Enter ile giriş yapma
usernameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') loginButton.click();
});

// Mesaj ve resim gönderme
sendButton.addEventListener('click', () => {
  sendMessage();
});
input.addEventListener('keydown', e => {
  if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
  const msg = input.value.trim();
  if (msg !== '') {
    socket.send(JSON.stringify({
      type: 'message',
      name: username,
      text: msg,
    }));
    input.value = '';
    input.focus();
  }

  // Resim seçildiyse Base64 olarak gönder
  const file = imageInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function () {
      const base64Image = reader.result;
      socket.send(JSON.stringify({
        type: 'image',
        name: username,
        image: base64Image,
      }));
      imageInput.value = ""; // input'u sıfırla
    };
    reader.readAsDataURL(file);
  }
}

socket.addEventListener('open', () => {
  console.log("Sunucuya bağlandı");
});

// Gelen mesajları dinle ve göster
socket.onmessage = async (event) => {
  let text;
  if (event.data instanceof Blob) {
    text = await event.data.text();
  } else {
    text = event.data;
  }

  let msg;
  try {
    msg = JSON.parse(text);
  } catch (err) {
    console.error('Geçersiz mesaj:', text);
    return;
  }

if (msg.type === 'kick') {
  alert(msg.reason || 'Atıldınız!');
  location.reload();
  return;
}

if (msg.type === "activeUsers") {
  const activeUsersList = document.getElementById("activeUsersList");
  const activeAdminsList = document.getElementById("activeAdminsList");

  activeUsersList.innerHTML = "";
  activeAdminsList.innerHTML = "";

  msg.users.forEach(user => {
    const li = document.createElement("li");

    const indicator = document.createElement("span");
    indicator.className = "user-indicator";

    li.appendChild(indicator);
    li.appendChild(document.createTextNode(user.replace(" [YETKILI]", "")));

    // Eğer sen admin isen (username'de [YETKILI] varsa) her kullanıcı için At butonu ekle
    // Sadece normal kullanıcılara ekle (yetkililere değil)
if (username.includes("[YETKILI]") && !user.includes("[YETKILI]")) {
  const kickBtn = document.createElement("button");
  kickBtn.textContent = "At";
  kickBtn.style.marginLeft = "10px";
  kickBtn.style.cursor = "pointer";
  kickBtn.className = "kick-button"; // Modern görünüm için class eklendi

  kickBtn.addEventListener('click', () => {
    confirmCustom(`${user} adlı kullanıcıyı atmak istediğine emin misin?`).then(confirmed => {
      if (confirmed) {
        socket.send(JSON.stringify({
          type: 'kick',
          target: user
        }));
      }
    });
  });

  li.appendChild(kickBtn);
}

    // Kullanıcı yetkili mi kontrol et
    if (user.includes("[YETKILI]")) {
      activeAdminsList.appendChild(li);
    } else {
      activeUsersList.appendChild(li);
    }
  });
  return;
}

  // Diğer mesajlar
  const newMessage = document.createElement('div');
  newMessage.className = 'message';

  if (msg.type === 'join') {
    newMessage.textContent = `🔔 ${msg.name} katıldı`;
    newMessage.style.fontStyle = 'italic';
    newMessage.style.color = 'gray';
  } else if (msg.type === 'leave') {
    newMessage.textContent = `🔔 ${msg.name} ayrıldı`;
    newMessage.style.fontStyle = 'italic';
    newMessage.style.color = 'gray';
  } else if (msg.type === 'message') {
    const userImage = document.createElement('img');
    userImage.className = 'profile-pic';
if (msg.type === 'message') {
  const userImage = document.createElement('img');
  userImage.classList.add('profile-pic');

  if (msg.avatar) {
    // Bot mesajı için avatar varsa kullan
    userImage.src = msg.avatar;
  } else if (msg.name.includes("[YETKILI]")) {
    userImage.src = 'admin.png';
    userImage.classList.add('admin-profile-pic');
  } else {
    userImage.src = 'asra2.ico';
  }

  const nameSpan = document.createElement('strong');
  nameSpan.textContent = `${msg.name}: `;

  newMessage.appendChild(userImage);
  newMessage.appendChild(nameSpan);
  newMessage.appendChild(document.createTextNode(msg.text));
}
  } else if (msg.type === 'image') {
  const userImage = document.createElement('img');
  userImage.classList.add('profile-pic');

  if (msg.name.includes("[YETKILI]")) {
    userImage.src = 'admin.png';
    userImage.classList.add('admin-profile-pic');
  } else {
    userImage.src = 'asra2.ico';
  }

  const nameSpan = document.createElement('strong');
  nameSpan.textContent = `${msg.name}: `;

  const img = document.createElement('img');
  img.src = msg.image;
  img.alt = "Gönderilen resim";
  img.className = 'sent-image';

  newMessage.appendChild(userImage);
  newMessage.appendChild(nameSpan);
  newMessage.appendChild(img);
}

  if (msg.name.includes("[YETKILI]")) {
    newMessage.classList.add('admin-message');
}

  messagesDiv.appendChild(newMessage);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
};

// Susturulan kullanıcılar burada tutulacak
const mutedUsers = new Set();

// Örnek: Mesaj ekleme fonksiyonu
function addMessageToChat(username, message) {
  const chatMessages = document.getElementById('chatMessages');

  // Eğer kullanıcı susturulmuşsa mesajı gösterme
  if (mutedUsers.has(username)) {
    return;
  }

  const msgDiv = document.createElement('div');
  msgDiv.textContent = `${username}: ${message}`;
  chatMessages.appendChild(msgDiv);

  chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll aşağı indir
}

// Sistem mesajı gösterme (susturma vb. bildirimler için)
function addSystemMessage(text) {
  const chatMessages = document.getElementById('chatMessages');
  const sysMsgDiv = document.createElement('div');
  sysMsgDiv.classList.add('system-message');
  sysMsgDiv.textContent = text;
  chatMessages.appendChild(sysMsgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Kullanıcı susturma fonksiyonu
function muteUser(username) {
  if (!mutedUsers.has(username)) {
    mutedUsers.add(username);
    addSystemMessage(`${username} susturuldu.`);
    updateActiveUsersList(); // Kullanıcı listesini güncelle (opsiyonel)
  }
}

// Susturmayı kaldırma
function unmuteUser(username) {
  if (mutedUsers.has(username)) {
    mutedUsers.delete(username);
    addSystemMessage(`${username} susturulma kaldırıldı.`);
    updateActiveUsersList(); // Kullanıcı listesini güncelle (opsiyonel)
  }
}

// Örnek: Aktif kullanıcı listesini güncelle (susturulanları kırmızı göstermek için)
function updateActiveUsersList() {
  const userList = document.getElementById('activeUsersList');
  // Burada mevcut kullanıcı listesini Asra2 sisteminden alman lazım
  // Örnek olarak aşağıda basit bir kullanıcı listesi var:

  const users = ['Ali', 'Ayşe', 'Mehmet', 'Zeynep']; // Örnek, senin asıl listen olmalı

  userList.innerHTML = '';
  users.forEach(user => {
    const li = document.createElement('li');
    li.textContent = user;
    if (mutedUsers.has(user)) {
      li.classList.add('muted');
    }
    userList.appendChild(li);
  });
}

// Örnek: Komut bazlı susturma
function processCommand(command) {
  const parts = command.split(' ');
  if(parts[0] === '/mute' && parts[1]) {
    muteUser(parts[1]);
  } else if(parts[0] === '/unmute' && parts[1]) {
    unmuteUser(parts[1]);
  } else {
    addSystemMessage('Bilinmeyen komut.');
  }
}

// Mesaj gönderme butonu örneği
document.getElementById('sendButton').addEventListener('click', () => {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  if (!message) return;

  // Komut ile susturma kontrolü
  if (message.startsWith('/')) {
    processCommand(message);
  } else {
    // Normal mesajı göster
    // Burada gerçek socket veya mesaj gönderme işini yapman lazım
    addMessageToChat('Sen', message);
  }

  input.value = '';
});
function addSystemMessage(text) {
  const chatMessages = document.getElementById('chatMessages');
  const sysMsgDiv = document.createElement('div');
  sysMsgDiv.classList.add('system-message');
  sysMsgDiv.textContent = text;
  chatMessages.appendChild(sysMsgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
function showToast(message, type = "info", duration = 4000) {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toast-message");
  const toastIcon = document.getElementById("toast-icon");

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️"
  };

  toast.setAttribute("data-type", type);
  toastMessage.textContent = message;
  toastIcon.textContent = icons[type] || "ℹ️";
  toast.classList.add("show");

  setTimeout(() => {
    hideToast();
  }, duration);
}

function hideToast() {
  const toast = document.getElementById("toast");
  toast.classList.remove("show");
}
const adminLoginButton = document.getElementById('adminLoginButton');
const adminModal = document.getElementById('adminModal');
const loginBtn = document.getElementById('loginBtn');

const adminNameInput = document.getElementById('adminName');
const adminPasswordInput = document.getElementById('adminPassword');

// Her iki inputta da Enter tuşunu dinle
[adminNameInput, adminPasswordInput].forEach(input => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // form submit engelle (gerekirse)
      loginBtn.click();   // login butonunu tetikle
    }
  });
});

adminLoginButton.addEventListener('click', () => {
  adminModal.classList.add('show');
});

loginBtn.addEventListener('click', () => {
  const name = adminNameInput.value.trim();
  const password = adminPasswordInput.value;

  if (!name || !password) {
    showToast("Lütfen tüm alanları doldurun.", "warning");
    return;
  }

  if (password === "admin123") {
    username = name + " [YETKILI]";  // global değişkeni güncelle

    socket.send(JSON.stringify({
      type: 'join',
      name: username,
    }));

    adminModal.classList.remove('show');
    loginScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
    activeUsersContainer.classList.remove('hidden');
    input.focus();
  } else {
    showToast("Hatalı şifre!", "warning");
  }
});

// Mesaj gönderme örneği (senin kendi mesaj gönderme koduna göre uyarlamalısın)
sendButton.addEventListener('click', () => {
  const text = input.value.trim();
  if (!text) return;

  socket.send(JSON.stringify({
    type: 'message',
    name: username,  // global username burada kullanılıyor
    text: text,
  }));

  input.value = "";
});
const closeModal = document.getElementById('closeModal');

closeModal.addEventListener('click', () => {
  // Modalı gizle
  adminModal.classList.remove('show');
  
  // Eğer istersen, giriş alanlarını temizle
  adminNameInput.value = '';
  adminPasswordInput.value = '';
});
// chatContainer: mesajların gösterildiği element
// name: kullanıcı adı (örneğin "Osman [YETKILI]")
// text: mesaj metni

function addMessage(name, text) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');

  // Yetkili mi kontrol et
  if (name.includes("[YETKILI]")) {
    messageElement.style.color = "#d9534f"; // kırmızı, istediğin renk olabilir
    messageElement.style.fontWeight = "bold";
  } else {
    messageElement.style.color = "#228B22"; // normal kullanıcı rengi
  }

  messageElement.textContent = `${name}: ${text}`;
  chatContainer.appendChild(messageElement);
}
function confirmCustom(message) {
  return new Promise(resolve => {
    const modal = document.getElementById('confirmModal');
    const msg = document.getElementById('confirmMessage');
    const yesBtn = document.getElementById('confirmYes');
    const noBtn = document.getElementById('confirmNo');

    msg.textContent = message;
    modal.classList.remove('hidden');

    const cleanup = () => {
      modal.classList.add('hidden');
      yesBtn.removeEventListener('click', onYes);
      noBtn.removeEventListener('click', onNo);
    };

    const onYes = () => {
      cleanup();
      resolve(true);
    };

    const onNo = () => {
      cleanup();
      resolve(false);
    };

    yesBtn.addEventListener('click', onYes);
    noBtn.addEventListener('click', onNo);
  });
}