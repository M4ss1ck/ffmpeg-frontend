# FFmpeg Frontend

A user-friendly desktop application for FFmpeg operations built with Electron, React, and TypeScript.

## Features

- 🎨 **Modern UI**: Clean, intuitive interface with custom title bar
- 🔒 **Secure**: Proper IPC isolation and security settings
- ⚡ **Fast**: Built with Vite for optimal development and build performance
- 🛠️ **Developer Friendly**: TypeScript, ESLint, Prettier, and hot reload
- 🎬 **FFmpeg Integration**: Streamlined video/audio processing workflows (coming soon)

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Desktop**: Electron 28
- **Build Tool**: Vite 5
- **State Management**: Zustand
- **Styling**: CSS with custom properties
- **Code Quality**: ESLint + Prettier

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ffmpeg-frontend

# Install dependencies
npm install
```

### Development Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Code formatting
npm run format

# Package the application
npm run package
```

### Project Structure

```
src/
├── main/           # Main Electron process
│   ├── main.ts     # Application entry point
│   ├── ipc/        # IPC handlers for secure communication
│   └── utils/      # Utility functions
├── preload/        # Preload scripts for secure IPC
├── renderer/       # React frontend
│   ├── components/ # React components
│   ├── styles/     # CSS styling
│   └── main.tsx    # React entry point
└── types/          # TypeScript definitions
```

## Building

The application uses a multi-target build system:

- **Main Process**: TypeScript → ES Modules (Node.js)
- **Preload Script**: TypeScript → CommonJS (Electron preload context)
- **Renderer Process**: Vite → Bundled for browser

## Security

This application follows Electron security best practices:

- ✅ Context isolation enabled
- ✅ Node integration disabled in renderer
- ✅ Secure IPC communication via preload scripts
- ✅ Content Security Policy implemented
- ✅ External navigation blocked

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Roadmap

- [x] ✅ Electron + React + TypeScript foundation
- [x] ✅ Custom title bar and window controls
- [x] ✅ Secure IPC communication
- [ ] 🚧 FFmpeg integration and file handling
- [ ] 📋 Video/audio conversion interface
- [ ] ⚙️ Advanced FFmpeg options
- [ ] 📊 Progress tracking and batch processing
- [ ] 🎨 Themes and customization

## Support

If you encounter any issues or have questions, please [open an issue](../../issues) on GitHub.
