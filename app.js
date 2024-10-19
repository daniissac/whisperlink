let peer;
let conn;

const UI = {
    connectionPage: document.getElementById('connection-page'),
    chatPage: document.getElementById('chat-page'),
    qrCodeDiv: document.getElementById('qr-code'),
    messagesDiv: document.getElementById('messages'),
    messageInput: document.getElementById('message-input')
};

function initializeApp() {
    peer = new Peer();
    peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        const urlParams = new URLSearchParams(window.location.search);
        const peerIdToConnect = urlParams.get('peer');
        
        if (peerIdToConnect) {
            connectToPeer(peerIdToConnect);
        } else {
            const chatLink = `${window.location.href}?peer=${id}`;
            generateQRCode(chatLink);
        }
    });

    peer.on('connection', (connection) => {
        conn = connection;
        setupConnection();
    });

    UI.messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });
}
function generateQRCode(text) {
    const qr = qrcode(0, 'L');
    qr.addData(text);
    qr.make();
    UI.qrCodeDiv.innerHTML = qr.createImgTag(5);
}

function connectToPeer(peerId) {
    conn = peer.connect(peerId);
    setupConnection();
}

function setupConnection() {
    conn.on('open', () => {
        console.log('Connection established');
        showChatPage();
    });

    conn.on('data', (data) => {
        const message = document.createElement('p');
        message.textContent = `Peer: ${data}`;
        UI.messagesDiv.appendChild(message);
    });
}

function showChatPage() {
    UI.connectionPage.style.display = 'none';
    UI.chatPage.style.display = 'block';
}


function sendMessage() {
    const message = UI.messageInput.value;
    if (message && conn && conn.open) {
        conn.send(message);
        const messageElement = document.createElement('p');
        messageElement.textContent = `You: ${message}`;
        UI.messagesDiv.appendChild(messageElement);
        UI.messageInput.value = '';
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
