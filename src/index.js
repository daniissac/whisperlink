import './styles.css';
const QRCode = require('qrcode');
const jsQR = require('jsqr');

let peerConnection;
let dataChannel;

const uiElements = {
  connectionPage: document.getElementById('connection-page'),
  chatPage: document.getElementById('chat-page'),
  scanQRButton: document.getElementById('scan-qr'),
  qrCodeDiv: document.getElementById('qr-code'),
  qrVideo: document.getElementById('qr-video'),
  messagesDiv: document.getElementById('messages'),
  messageInput: document.getElementById('message-input'),
  sendMessageButton: document.getElementById('send-message')
};

let isScanning = false;

uiElements.scanQRButton.addEventListener('click', toggleQRScanner);
uiElements.sendMessageButton.addEventListener('click', sendMessage);

window.addEventListener('load', () => {
  console.log(`Page loaded, generating QR code...`);
  generateQRCode();
});

async function generateQRCode() {
  try {
    console.log('Generating QR code...');
    const offer = await createOffer();
    console.log('Offer created:', offer);
    if (!offer) {
      console.error('Failed to create offer');
      uiElements.qrCodeDiv.textContent = 'Failed to create offer';
      return;
    }
    const qrData = JSON.stringify(offer);
    const canvas = await QRCode.toCanvas(qrData, { width: 200, height: 200 });
    console.log('QR code generated');
    uiElements.qrCodeDiv.innerHTML = ''; // Clear any existing content
    uiElements.qrCodeDiv.appendChild(canvas);
  } catch (error) {
    console.error('Error generating QR code:', error);
    uiElements.qrCodeDiv.textContent = 'Error generating QR code';
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

const toggleQRScanner = () => {
  if (isScanning) {
    stopQRScanner();
  } else {
    startQRScanner();
  }
};

const startQRScanner = () => {
  isScanning = true;
  uiElements.qrCodeDiv.style.display = 'none';
  uiElements.qrVideo.style.display = 'block';
  uiElements.scanQRButton.textContent = 'Cancel Scan';
  
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      uiElements.qrVideo.srcObject = stream;
      uiElements.qrVideo.play();
      requestAnimationFrame(scanQRCode);
    })
    .catch(error => {
      console.error('Error accessing camera:', error);
      stopQRScanner();
    });
};

const stopQRScanner = () => {
  isScanning = false;
  uiElements.qrCodeDiv.style.display = 'block';
  uiElements.qrVideo.style.display = 'none';
  uiElements.scanQRButton.textContent = 'Scan QR Code';
  
  if (uiElements.qrVideo.srcObject) {
    uiElements.qrVideo.srcObject.getTracks().forEach(track => track.stop());
  }
};

const scanQRCode = () => {
  if (!isScanning) return;

  const canvas = document.createElement('canvas');
  canvas.width = uiElements.qrVideo.videoWidth;
  canvas.height = uiElements.qrVideo.videoHeight;
  canvas.getContext('2d').drawImage(uiElements.qrVideo, 0, 0, canvas.width, canvas.height);
  const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height);

  if (code) {
    stopQRScanner();
    handleScannedData(code.data);
  } else {
    requestAnimationFrame(scanQRCode);
  }
};

const handleScannedData = async (data) => {
  const { type, sdp } = JSON.parse(data);
  if (type === 'offer') {
    await handleOffer(sdp);
  }
};

const handleOffer = async (offerSdp) => {
  try {
    peerConnection = new RTCPeerConnection();
    peerConnection.ondatachannel = (event) => {
      dataChannel = event.channel;
      setupDataChannel();
    };

    await peerConnection.setRemoteDescription({ type: 'offer', sdp: offerSdp });
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    const qrData = JSON.stringify({ type: 'answer', sdp: answer.sdp });
    await QRCode.toCanvas(uiElements.qrCodeDiv, qrData, { width: 300 });
  } catch (error) {
    console.error('Error handling offer:', error);
  }
};

const setupDataChannel = () => {
  dataChannel.onopen = () => {
    console.log('Data channel is open');
    uiElements.connectionPage.style.display = 'none';
    uiElements.chatPage.style.display = 'block';
  };

  dataChannel.onmessage = (event) => {
    const message = document.createElement('p');
    message.textContent = `Peer: ${event.data}`;
    uiElements.messagesDiv.appendChild(message);
  };
};

const sendMessage = () => {
  const message = uiElements.messageInput.value;
  if (message && dataChannel.readyState === 'open') {
    dataChannel.send(message);
    const messageElement = document.createElement('p');
    messageElement.textContent = `You: ${message}`;
    uiElements.messagesDiv.appendChild(messageElement);
    uiElements.messageInput.value = '';
  }
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/whisperlink/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    });
  }