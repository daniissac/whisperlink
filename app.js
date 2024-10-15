let peer;
let conn;

const UI = {
    connectionPage: document.getElementById('connection-page'),
    chatPage: document.getElementById('chat-page'),
    scanQRButton: document.getElementById('scan-qr'),
    qrCodeDiv: document.getElementById('qr-code'),
    qrVideo: document.getElementById('qr-video'),
    messagesDiv: document.getElementById('messages'),
    messageInput: document.getElementById('message-input'),
    sendMessageButton: document.getElementById('send-message')
};

function initializeApp() {
    peer = new Peer();
    peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        generateQRCode(id);
    });
    peer.on('connection', (connection) => {
        conn = connection;
        setupConnection();
    });

    UI.scanQRButton.addEventListener('click', startQRScanner);
    UI.sendMessageButton.addEventListener('click', sendMessage);
}
function generateQRCode(text) {
    const canvas = document.getElementById('qrcode');
    if (canvas && canvas.getContext) {
        QRCode.render({
            canvas: canvas,
            text: text,
            width: 256,
            height: 256
        });
    } else {
        console.error('Canvas element not found or doesn\'t support getContext');
    }
}
function startQRScanner() {
    UI.qrCodeDiv.style.display = 'none';
    UI.qrVideo.style.display = 'block';
    UI.scanQRButton.textContent = 'Cancel Scan';
    UI.scanQRButton.removeEventListener('click', startQRScanner);
    UI.scanQRButton.addEventListener('click', stopQRScanner);

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
            UI.qrVideo.srcObject = stream;
            UI.qrVideo.play();
            requestAnimationFrame(scanQRCode);
        })
        .catch(error => {
            console.error('Error accessing camera:', error);
            stopQRScanner();
        });
}

function stopQRScanner() {
    UI.qrCodeDiv.style.display = 'block';
    UI.qrVideo.style.display = 'none';
    UI.scanQRButton.textContent = 'Scan QR Code';
    UI.scanQRButton.removeEventListener('click', stopQRScanner);
    UI.scanQRButton.addEventListener('click', startQRScanner);

    if (UI.qrVideo.srcObject) {
        UI.qrVideo.srcObject.getTracks().forEach(track => track.stop());
        UI.qrVideo.srcObject = null;
    }
}
function scanQRCode() {
    if (UI.qrVideo.readyState === UI.qrVideo.HAVE_ENOUGH_DATA) {
        const canvas = document.createElement('canvas');
        canvas.width = UI.qrVideo.videoWidth;
        canvas.height = UI.qrVideo.videoHeight;
        canvas.getContext('2d').drawImage(UI.qrVideo, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
            console.log("Found QR code", code.data);
            connectToPeer(code.data);
            UI.qrVideo.srcObject.getTracks().forEach(track => track.stop());
            UI.qrVideo.style.display = 'none';
        }
    }
    requestAnimationFrame(scanQRCode);
}
function connectToPeer(peerId) {
    conn = peer.connect(peerId);
    setupConnection();
}

function setupConnection() {
    conn.on('open', () => {
        console.log('Connection established');
        UI.connectionPage.style.display = 'none';
        UI.chatPage.style.display = 'block';
    });

    conn.on('data', (data) => {
        const message = document.createElement('p');
        message.textContent = `Peer: ${data}`;
        UI.messagesDiv.appendChild(message);
    });
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