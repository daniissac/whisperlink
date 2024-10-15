let peerConnection;
let dataChannel;
let isScanning = false;

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
    UI.scanQRButton.addEventListener('click', toggleQRScanner);
    UI.sendMessageButton.addEventListener('click', sendMessage);
    generateQRCode();
}

async function generateQRCode() {
    try {
        const offer = await createOffer();
        if (!offer) {
            throw new Error('Failed to create offer');
        }
        const qrData = JSON.stringify(offer);
        const canvas = await QRCode.toCanvas(qrData, { width: 200, height: 200 });
        UI.qrCodeDiv.innerHTML = '';
        UI.qrCodeDiv.appendChild(canvas);
    } catch (error) {
        console.error('Error generating QR code:', error);
        UI.qrCodeDiv.textContent = 'Error generating QR code';
    }
}

async function createOffer() {
    try {
        peerConnection = new RTCPeerConnection();
        dataChannel = peerConnection.createDataChannel('chat');
        setupDataChannel();

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        return { type: 'offer', sdp: offer.sdp };
    } catch (error) {
        console.error('Error creating offer:', error);
        return null;
    }
}

function toggleQRScanner() {
    isScanning ? stopQRScanner() : startQRScanner();
}

function startQRScanner() {
    isScanning = true;
    UI.qrCodeDiv.style.display = 'none';
    UI.qrVideo.style.display = 'block';
    UI.scanQRButton.textContent = 'Cancel Scan';
    
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

function scanQRCode() {
    if (!isScanning) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = UI.qrVideo.videoWidth;
    canvas.height = UI.qrVideo.videoHeight;
    context.drawImage(UI.qrVideo, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
        console.log("Found QR code", code.data);
        stopQRScanner();
        handleScannedOffer(JSON.parse(code.data));
    } else {
        requestAnimationFrame(scanQRCode);
    }
}

function stopQRScanner() {
    isScanning = false;
    UI.qrCodeDiv.style.display = 'block';
    UI.qrVideo.style.display = 'none';
    UI.scanQRButton.textContent = 'Scan QR Code';
    
    if (UI.qrVideo.srcObject) {
        UI.qrVideo.srcObject.getTracks().forEach(track => track.stop());
        UI.qrVideo.srcObject = null;
    }
}

function setupDataChannel() {
    dataChannel.onopen = () => {
        console.log('Data channel is open');
        UI.connectionPage.style.display = 'none';
        UI.chatPage.style.display = 'block';
    };

    dataChannel.onmessage = event => {
        const message = document.createElement('p');
        message.textContent = `Peer: ${event.data}`;
        UI.messagesDiv.appendChild(message);
    };
}

function sendMessage() {
    const message = UI.messageInput.value;
    if (message && dataChannel.readyState === 'open') {
        dataChannel.send(message);
        const messageElement = document.createElement('p');
        messageElement.textContent = `You: ${message}`;
        UI.messagesDiv.appendChild(messageElement);
        UI.messageInput.value = '';
    }
}

async function handleScannedOffer(offer) {
    try {
        peerConnection = new RTCPeerConnection();
        peerConnection.ondatachannel = event => {
            dataChannel = event.channel;
            setupDataChannel();
        };

        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        console.log('Answer created:', answer);
    } catch (error) {
        console.error('Error handling scanned offer:', error);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
