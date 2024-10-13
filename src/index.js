import QRCode from 'qrcode';
import jsQR from 'jsqr';

let peerConnection;
let dataChannel;

const connectionPage = document.getElementById('connection-page');
const chatPage = document.getElementById('chat-page');
const generateQRButton = document.getElementById('generate-qr');
const scanQRButton = document.getElementById('scan-qr');
const qrCodeDiv = document.getElementById('qr-code');
const qrVideo = document.getElementById('qr-video');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendMessageButton = document.getElementById('send-message');

generateQRButton.addEventListener('click', generateQRCode);
scanQRButton.addEventListener('click', startQRScanner);
sendMessageButton.addEventListener('click', sendMessage);

async function generateQRCode() {
    const offer = await createOffer();
    const qrData = JSON.stringify(offer);
    QRCode.toCanvas(qrCodeDiv, qrData, { width: 300 }, (error) => {
        if (error) console.error(error);
    });
}

async function createOffer() {
    peerConnection = new RTCPeerConnection();
    dataChannel = peerConnection.createDataChannel('chat');
    setupDataChannel();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return { type: 'offer', sdp: offer.sdp };
}

function startQRScanner() {
    qrVideo.style.display = 'block';
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
            qrVideo.srcObject = stream;
            qrVideo.play();
            requestAnimationFrame(scanQRCode);
        })
        .catch(error => {
            console.error('Error accessing camera:', error);
        });
}

function scanQRCode() {
    const canvas = document.createElement('canvas');
    canvas.width = qrVideo.videoWidth;
    canvas.height = qrVideo.videoHeight;
    canvas.getContext('2d').drawImage(qrVideo, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
        qrVideo.srcObject.getTracks().forEach(track => track.stop());
        qrVideo.style.display = 'none';
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
