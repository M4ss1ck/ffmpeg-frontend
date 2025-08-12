# FFmpeg Frontend - Packaging Guide

This guide explains how to build distributable packages for different platforms.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **FFmpeg** installed on the system (for testing)

## Building Packages

### Install Dependencies

```bash
npm install
```

### Build for All Platforms

```bash
npm run package:all
```

### Build for Specific Platforms

#### Windows

```bash
npm run package:win
```

Creates:

- `release/FFmpeg Frontend Setup 1.0.0.exe` (NSIS installer)
- `release/FFmpeg Frontend 1.0.0.exe` (Portable executable)

#### Linux

```bash
npm run package:linux
```

Creates:

- `release/FFmpeg Frontend-1.0.0.AppImage` (Universal Linux package)
- `release/ffmpeg-frontend_1.0.0_amd64.deb` (Debian/Ubuntu package)
- `release/ffmpeg-frontend-1.0.0.x86_64.rpm` (Red Hat/Fedora package)
- `release/ffmpeg-frontend-1.0.0.tar.gz` (Generic Linux archive)

## Package Details

### Windows Packages

- **NSIS Installer**: Full installer with desktop shortcuts and start menu entries
- **Portable**: Standalone executable that doesn't require installation

### Linux Packages

- **AppImage**: Universal Linux package that runs on most distributions
- **DEB**: Package for Debian, Ubuntu, and derivatives
- **RPM**: Package for Red Hat, Fedora, CentOS, and derivatives
- **TAR.GZ**: Generic archive for manual installation

## System Requirements

### Windows

- Windows 10 or later (64-bit recommended)
- 4GB RAM minimum
- 500MB free disk space

### Linux

- Modern Linux distribution (Ubuntu 18.04+, Fedora 30+, etc.)
- 4GB RAM minimum
- 500MB free disk space
- FFmpeg installed (automatically handled by DEB/RPM packages)

## Icons and Assets

The application uses platform-specific icons:

- `assets/icon.ico` - Windows icon
- `assets/icon.icns` - macOS icon (for future use)
- `assets/icon.png` - Linux icon

## File Associations

The Linux packages automatically register file associations for:

- Video formats: MP4, AVI, MKV, MOV, WMV, FLV, WebM
- Audio formats: MP3, WAV, FLAC, AAC, OGG

## Distribution

### Windows

- The NSIS installer can be distributed directly to users
- The portable version requires no installation

### Linux

- AppImage can be distributed directly and runs on most distributions
- DEB packages can be installed with `sudo dpkg -i package.deb`
- RPM packages can be installed with `sudo rpm -i package.rpm`
- TAR.GZ can be extracted and run manually

## Troubleshooting

### Common Issues

1. **FFmpeg not found**: Ensure FFmpeg is installed and in PATH
2. **Permission errors**: Run with appropriate permissions for package installation
3. **Missing dependencies**: Install required system libraries

### Build Issues

1. **Node.js version**: Ensure you're using Node.js v18 or higher
2. **Clean build**: Run `npm run clean` before building if you encounter issues
3. **Platform-specific builds**: Use the appropriate platform for building (Windows for .exe, Linux for .deb/.rpm)

## Development

For development builds:

```bash
npm run dev
```

For production builds without packaging:

```bash
npm run build
```
