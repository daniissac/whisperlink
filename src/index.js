import './styles.css';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
let peerConnection;
let dataChannel;

const connectionPage = document.getElementById('connection-page');
const chatPage = document.getElementById('chat-page');
const scanQRButton = document.getElementById('scan-qr');
const qrCodeDiv = document.getElementById('qr-code');
const qrVideo = document.getElementById('qr-video');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendMessageButton = document.getElementById('send-message');

let isScanning = false;

scanQRButton.addEventListener('click', toggleQRScanner);
sendMessageButton.addEventListener('click', sendMessage);

window.addEventListener('load', () => {
    console.log('Page loaded, generating QR code...');
    generateQRCode();
});

async function generateQRCode() {
    console.log('Generating QR code...');
    const offer = await createOffer();
    console.log('Offer created:', offer);
    if (!offer) {
        console.error('Failed to create offer');
        qrCodeDiv.textContent = 'Failed to create offer';
        return;
    }
    const qrData = JSON.stringify(offer);
    try {
        const canvas = await QRCode.toCanvas(qrData, { width: 200, height: 200 });
        console.log('QR code generated');
        qrCodeDiv.innerHTML = ''; // Clear any existing content
        qrCodeDiv.appendChild(canvas);
    } catch (error) {
        console.error('Error generating QR code:', error);
        qrCodeDiv.textContent = 'Error generating QR code';
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
    if (isScanning) {
        stopQRScanner();
    } else {
        startQRScanner();
    }
}

function startQRScanner() {
    isScanning = true;
    qrCodeDiv.style.display = 'none';
    qrVideo.style.display = 'block';
    scanQRButton.textContent = 'Cancel Scan';
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
            qrVideo.srcObject = stream;
            qrVideo.play();
            requestAnimationFrame(scanQRCode);
        })
        .catch(error => {
            console.error('Error accessing camera:', error);
            stopQRScanner();
        });
}

function stopQRScanner() {
    isScanning = false;
    qrCodeDiv.style.display = 'block';
    qrVideo.style.display = 'none';
    scanQRButton.textContent = 'Scan QR Code';
    
    if (qrVideo.srcObject) {
        qrVideo.srcObject.getTracks().forEach(track => track.stop());
    }
}

function scanQRCode() {
    if (!isScanning) return;

    const canvas = document.createElement('canvas');
    canvas.width = qrVideo.videoWidth;
    canvas.height = qrVideo.videoHeight;
    canvas.getContext('2d').drawImage(qrVideo, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
        stopQRScanner();
        handleScannedData(code.data);
    } else {
        requestAnimationFrame(scanQRCode);
    }
}
async function handleScannedData(data) {
    const { type, sdp } = JSON.parse(data);
    if (type === 'offer') {
        await handleOffer(sdp);
    }
}

async function handleOffer(offerSdp) {
    peerConnection = new RTCPeerConnection();
    peerConnection.ondatachannel = (event) => {
        dataChannel = event.channel;
        setupDataChannel();
    };

    await peerConnection.setRemoteDescription({ type: 'offer', sdp: offerSdp });
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    const qrData = JSON.stringify({ type: 'answer', sdp: answer.sdp });
    QRCode.toCanvas(qrCodeDiv, qrData, { width: 300 }, (error) => {
        if (error) console.error(error);
    });
}

function setupDataChannel() {
    dataChannel.onopen = () => {
        console.log('Data channel is open');
        connectionPage.style.display = 'none';
        chatPage.style.display = 'block';
    };

    dataChannel.onmessage = (event) => {
        const message = document.createElement('p');
        message.textContent = `Peer: ${event.data}`;
        messagesDiv.appendChild(message);
    };
}

function sendMessage() {
    const message = messageInput.value;
    if (message && dataChannel.readyState === 'open') {
        dataChannel.send(message);
        const messageElement = document.createElement('p');
        messageElement.textContent = `You: ${message}`;
        messagesDiv.appendChild(messageElement);
        messageInput.value = '';
    }
}
