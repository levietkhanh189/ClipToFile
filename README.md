# Clip To File

A Chrome extension that allows you to save selected text or clipboard content as PDF, TXT, or Markdown files.

## Features

- Right-click context menu to save selected text
- Popup interface to save clipboard text
- Supports multiple file formats:
  - PDF - For formatted documents
  - TXT - For plain text
  - Markdown - For preserving basic formatting

## Installation

### Manual Installation (Developer Mode)

1. Download or clone this repository to your local machine
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked" and select the folder containing the extension files
5. The extension should now be installed and visible in your Chrome toolbar

## Usage

### Using the Context Menu

1. Select text on any webpage
2. Right-click on the selected text
3. In the context menu, hover over "Save selected text as..."
4. Choose your desired format (PDF, TXT, Markdown)
5. Choose where to save the file when prompted

### Using the Popup

1. Click the extension icon in the Chrome toolbar
2. The popup will display the current clipboard content
3. Click one of the format buttons to save the text in that format
4. Choose where to save the file when prompted

### Using Clipboard Content

1. Copy text from any source (webpage, document, etc.)
2. Right-click anywhere on a webpage
3. In the context menu, hover over "Save clipboard text as..."
4. Choose your desired format
5. Choose where to save the file when prompted

## Technical Details

- Built with JavaScript, HTML, and CSS
- Uses Chrome Extension API (Manifest V3)
- Uses jsPDF library for PDF generation

## Known Limitations

- PDF formatting is basic (no advanced styling or formatting)
- Requires clipboard permission to access clipboard content
- When using the context menu for clipboard text, the extension needs to be active on the current tab

## License

This project is licensed under the MIT License - see the LICENSE file for details. 