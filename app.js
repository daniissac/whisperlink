class WhisperLink {
    constructor() {
        this.peer = null;
        this.connection = null;
        this.isInitiator = false;
        this.selectedFile = null;
        this.activeTransfers = new Map();
        this.setupUI();
        this.initialize();
    }

    setupUI() {
        // UI Elements
        this.qrContainer = document.getElementById('qr-code');
        this.shareUrl = document.getElementById('share-url');
        this.copyButton = document.getElementById('copy-button');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.messagesContainer = document.getElementById('messages');
        this.connectionSection = document.getElementById('connection-section');
        this.chatSection = document.getElementById('chat-section');
        this.statusText = document.getElementById('status-text');
        this.fileInput = document.getElementById('file-input');
        this.filePreview = document.getElementById('file-preview');
        this.imagePreview = document.getElementById('image-preview');
        this.fileInfo = document.getElementById('file-info');
        this.fileName = document.getElementById('file-name');
        this.fileSize = document.getElementById('file-size');
        this.cancelFile = document.getElementById('cancel-file');
        this.uploadProgress = document.getElementById('upload-progress');
        this.progressTemplate = document.getElementById('transfer-progress-template');

        // Event Listeners
        this.copyButton.addEventListener('click', () => this.copyShareLink());
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.cancelFile.addEventListener('click', () => this.clearFileSelection());
    }

    async initialize() {
        const urlParams = new URLSearchParams(window.location.search);
        const peerId = urlParams.get('id');

        if (peerId) {
            this.isInitiator = false;
            await this.joinChat(peerId);
        } else {
            this.isInitiator = true;
            await this.createNewChat();
        }
    }

    async createNewChat() {
        this.peer = new Peer(this.generatePeerId());
        
        this.peer.on('open', (id) => {
            const shareUrl = `${window.location.origin}${window.location.pathname}?id=${id}`;
            this.shareUrl.value = shareUrl;
            this.generateQRCode(shareUrl);
            this.statusText.textContent = 'Waiting for someone to join...';
        });

        this.peer.on('connection', (conn) => {
            this.connection = conn;
            this.setupConnectionHandlers();
            this.statusText.textContent = 'Connected!';
            this.showChatInterface();
        });

        this.peer.on('error', (err) => {
            console.error('Peer error:', err);
            this.statusText.textContent = 'Connection error. Please try again.';
        });
    }

    async joinChat(peerId) {
        this.peer = new Peer();
        
        this.peer.on('open', () => {
            this.connection = this.peer.connect(peerId);
            this.setupConnectionHandlers();
        });

        this.peer.on('error', (err) => {
            console.error('Peer error:', err);
            this.statusText.textContent = 'Connection error. Please try again.';
        });
    }

    setupConnectionHandlers() {
        this.connection.on('open', () => {
            this.statusText.textContent = 'Connected!';
            this.showChatInterface();
        });

        this.connection.on('data', (data) => {
            if (data.type === 'file-start') {
                this.handleIncomingFileStart(data);
            } else if (data.type === 'file-chunk') {
                this.handleIncomingFileChunk(data);
            } else if (data.type === 'file-end') {
                this.handleIncomingFileEnd(data);
            } else if (data.type === 'text') {
                this.displayMessage(data, false);
            }
        });

        this.connection.on('close', () => {
            this.statusText.textContent = 'Connection closed';
            this.showConnectionInterface();
        });
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.selectedFile = file;
        this.filePreview.classList.remove('hidden');
        this.fileName.textContent = file.name;
        this.fileSize.textContent = this.formatFileSize(file.size);

        if (file.type.startsWith('image/')) {
            this.imagePreview.classList.remove('hidden');
            this.fileInfo.classList.add('hidden');
            const reader = new FileReader();
            reader.onload = (e) => {
                this.imagePreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            this.imagePreview.classList.add('hidden');
            this.fileInfo.classList.remove('hidden');
        }
    }

    async sendFile() {
        if (!this.selectedFile || !this.connection) return;

        const file = this.selectedFile;
        const chunkSize = 16384; // 16KB chunks
        const totalChunks = Math.ceil(file.size / chunkSize);
        const transferId = this.generateTransferId();

        // Create message element with progress bar
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'sent');
        messageElement.innerHTML = `
            <div>Sending: ${file.name}</div>
            ${this.progressTemplate.innerHTML}
        `;
        this.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();

        const progressBar = messageElement.querySelector('.progress-fill');
        const progressText = messageElement.querySelector('.progress-text');
        const cancelButton = messageElement.querySelector('.cancel-transfer');

        // Send file start message
        this.connection.send({
            type: 'file-start',
            transferId,
            name: file.name,
            size: file.size,
            mimeType: file.type,
            totalChunks
        });

        // Read and send file chunks
        const reader = new FileReader();
        let currentChunk = 0;

        const sendNextChunk = () => {
            if (currentChunk >= totalChunks) {
                this.connection.send({
                    type: 'file-end',
                    transferId
                });
                
                // Display the sent file
                messageElement.innerHTML = '';
                if (file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.src = URL.createObjectURL(file);
                    messageElement.appendChild(img);
                } else {
                    const fileMessage = document.createElement('div');
                    fileMessage.classList.add('file-message');
                    fileMessage.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                            <polyline points="13 2 13 9 20 9"></polyline>
                        </svg>
                    `;

                    const fileInfo = document.createElement('div');
                    fileInfo.classList.add('file-info');
                    
                    const fileName = document.createElement('span');
                    fileName.classList.add('file-name');
                    fileName.textContent = file.name;

                    const fileSize = document.createElement('span');
                    fileSize.classList.add('file-size');
                    fileSize.textContent = this.formatFileSize(file.size);

                    fileInfo.appendChild(fileName);
                    fileInfo.appendChild(fileSize);
                    fileMessage.appendChild(fileInfo);

                    const downloadLink = document.createElement('a');
                    downloadLink.href = URL.createObjectURL(file);
                    downloadLink.download = file.name;
                    downloadLink.appendChild(fileMessage);
                    messageElement.appendChild(downloadLink);
                }
                
                this.clearFileSelection();
                return;
            }

            const start = currentChunk * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);

            reader.onload = (e) => {
                this.connection.send({
                    type: 'file-chunk',
                    transferId,
                    chunk: e.target.result,
                    chunkIndex: currentChunk
                });

                currentChunk++;
                const progress = (currentChunk / totalChunks) * 100;
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `${Math.round(progress)}%`;

                sendNextChunk();
            };

            reader.readAsArrayBuffer(chunk);
        };

        cancelButton.addEventListener('click', () => {
            messageElement.remove();
            this.clearFileSelection();
        });

        sendNextChunk();
    }

    handleIncomingFileStart(data) {
        const { transferId, name, size, mimeType, totalChunks } = data;
        
        // Create transfer state
        this.activeTransfers.set(transferId, {
            name,
            size,
            mimeType,
            totalChunks,
            chunks: new Array(totalChunks),
            receivedChunks: 0
        });

        // Create message element with progress bar
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'received');
        messageElement.innerHTML = `
            <div>Receiving: ${name}</div>
            ${this.progressTemplate.innerHTML}
        `;
        this.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();

        // Store elements in transfer state
        this.activeTransfers.get(transferId).elements = {
            message: messageElement,
            progressBar: messageElement.querySelector('.progress-fill'),
            progressText: messageElement.querySelector('.progress-text'),
            cancelButton: messageElement.querySelector('.cancel-transfer')
        };
    }

    handleIncomingFileChunk(data) {
        const { transferId, chunk, chunkIndex } = data;
        const transfer = this.activeTransfers.get(transferId);
        if (!transfer) return;

        // Store chunk
        transfer.chunks[chunkIndex] = chunk;
        transfer.receivedChunks++;

        // Update progress
        const progress = (transfer.receivedChunks / transfer.totalChunks) * 100;
        transfer.elements.progressBar.style.width = `${progress}%`;
        transfer.elements.progressText.textContent = `${Math.round(progress)}%`;
    }

    handleIncomingFileEnd(data) {
        const { transferId } = data;
        const transfer = this.activeTransfers.get(transferId);
        if (!transfer) return;

        // Combine chunks
        const blob = new Blob(transfer.chunks, { type: transfer.mimeType });
        const url = URL.createObjectURL(blob);

        // Replace progress bar with final message
        transfer.elements.message.innerHTML = '';
        
        if (transfer.mimeType.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = url;
            transfer.elements.message.appendChild(img);
        } else {
            const fileMessage = document.createElement('div');
            fileMessage.classList.add('file-message');
            
            // Add file icon
            fileMessage.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                    <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
            `;

            const fileInfo = document.createElement('div');
            fileInfo.classList.add('file-info');
            
            const fileName = document.createElement('span');
            fileName.classList.add('file-name');
            fileName.textContent = transfer.name;
            
            const fileSize = document.createElement('span');
            fileSize.classList.add('file-size');
            fileSize.textContent = this.formatFileSize(transfer.size);

            fileInfo.appendChild(fileName);
            fileInfo.appendChild(fileSize);
            fileMessage.appendChild(fileInfo);

            // Add download link
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = transfer.name;
            downloadLink.appendChild(fileMessage);
            transfer.elements.message.appendChild(downloadLink);
        }

        // Clean up
        this.activeTransfers.delete(transferId);
        this.scrollToBottom();
    }

    generateTransferId() {
        return `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async sendMessage() {
        if (this.selectedFile) {
            await this.sendFile();
        } else {
            const message = this.messageInput.value.trim();
            if (message && this.connection) {
                this.connection.send({ type: 'text', content: message });
                this.displayMessage({ type: 'text', content: message }, true);
                this.messageInput.value = '';
            }
        }
    }

    displayMessage(data, isSent) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(isSent ? 'sent' : 'received');
        messageElement.textContent = data.content;
        this.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    displayFile(data, isSent) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(isSent ? 'sent' : 'received');

        if (data.mimeType.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = data.content;
            messageElement.appendChild(img);
        } else {
            const fileMessage = document.createElement('div');
            fileMessage.classList.add('file-message');
            
            // Add file icon
            fileMessage.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                    <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
            `;

            const fileInfo = document.createElement('div');
            fileInfo.classList.add('file-info');
            
            const fileName = document.createElement('span');
            fileName.classList.add('file-name');
            fileName.textContent = data.name;
            
            const fileSize = document.createElement('span');
            fileSize.classList.add('file-size');
            fileSize.textContent = this.formatFileSize(data.size);

            fileInfo.appendChild(fileName);
            fileInfo.appendChild(fileSize);
            fileMessage.appendChild(fileInfo);

            // Add download link
            const downloadLink = document.createElement('a');
            downloadLink.href = data.content;
            downloadLink.download = data.name;
            downloadLink.appendChild(fileMessage);
            messageElement.appendChild(downloadLink);
        }

        this.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    generatePeerId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    generateQRCode(url) {
        const qr = qrcode(0, 'M');
        qr.addData(url);
        qr.make();
        this.qrContainer.innerHTML = qr.createImgTag(5);
    }

    async copyShareLink() {
        try {
            await navigator.clipboard.writeText(this.shareUrl.value);
            this.copyButton.textContent = 'Copied!';
            setTimeout(() => {
                this.copyButton.textContent = 'Copy Link';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    showChatInterface() {
        this.connectionSection.classList.add('hidden');
        this.chatSection.classList.remove('hidden');
        this.messageInput.focus();
    }

    showConnectionInterface() {
        this.connectionSection.classList.remove('hidden');
        this.chatSection.classList.add('hidden');
    }

    clearFileSelection() {
        this.selectedFile = null;
        this.fileInput.value = '';
        this.filePreview.classList.add('hidden');
        this.imagePreview.classList.add('hidden');
        this.fileInfo.classList.add('hidden');
        this.uploadProgress.classList.add('hidden');
        this.uploadProgress.querySelector('.progress-fill').style.width = '0';
        this.uploadProgress.querySelector('.progress-text').textContent = '0%';
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new WhisperLink();
});
