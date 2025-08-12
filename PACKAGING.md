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

- `release/Massiffmpeg Setup 1.0.0.exe` (NSIS installer)

#### Linux

```bash
npm run package:linux
```

Creates:

- `release/massiffmpeg-1.0.0.AppImage` (Universal Linux package)

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

## File Associations

The Linux packages automatically register file associations for:

- Video formats: MP4, AVI, MKV, MOV, WMV, FLV, WebM
- Audio formats: MP3, WAV, FLAC, AAC, OGG

## Distribution

### Windows

- The NSIS installer can be distributed directly to users

### Linux

- AppImage can be distributed directly and runs on most distributions

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
