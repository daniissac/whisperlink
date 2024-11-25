# WhisperLink

A secure, server-less peer-to-peer web messaging application focused on privacy and direct communication.

![WhisperLink Logo](logo.svg)

## Features

### Core Functionality
- 🔒 Secure peer-to-peer messaging using WebRTC
- 🌐 No server required - completely decentralized
- 🔑 No account registration needed
- 🔗 Easy connection via QR code or share link

### File Sharing
- 📁 Support for any file type
- 🖼️ Image preview and gallery view
- 📊 Real-time transfer progress indicators
- ⏸️ Cancel transfer option
- 📦 Chunked file transfer for large files
- 🔄 Automatic file type detection
- 💾 Direct peer-to-peer file transfer
- 📱 Mobile-responsive file handling

### User Interface
- 🎨 Modern, clean design
- 📱 Fully responsive layout
- 🌓 Custom SVG icons and branding
- ⚡ Real-time status updates
- 🔍 File preview before sending
- 📈 Visual progress tracking

### Security
- 🔐 End-to-end encryption via WebRTC
- 🚫 No data storage or tracking
- 📡 Direct peer connections
- 🔒 No server intermediary

## How to Use

1. **Start a Chat**
   - Open WhisperLink in your browser
   - Share the generated QR code or link with your peer
   - Wait for connection

2. **Send Messages**
   - Type your message in the input field
   - Press Enter or click Send
   - Messages appear instantly

3. **Share Files**
   - Click the attachment icon or drag & drop files
   - Preview the file before sending
   - Monitor transfer progress
   - Cancel transfer if needed
   - Files are sent directly to peer

## Technical Details

### Technologies Used
- Vanilla JavaScript (No framework dependencies)
- WebRTC (PeerJS library)
- QR Code Generation (qrcode-generator)
- Modern CSS3 Features
- SVG Icons and Animations

### File Transfer Implementation
- Chunk size: 16KB
- Progress tracking for both sender and receiver
- Automatic file type detection
- Blob handling for file reconstruction
- URL.createObjectURL for file preview
- ArrayBuffer for efficient transfer


## Roadmap

- [ ] Group chat support
- [ ] Enhanced encryption indicators
- [ ] Offline message queueing
- [ ] Custom emoji support
- [ ] Screen sharing
- [ ] Voice/Video chat
- [ ] File compression
- [ ] Collaborative features

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- PeerJS team for the WebRTC implementation
- QR Code Generator library
- Open source community

---

Made with ❤️ for secure, private communication
