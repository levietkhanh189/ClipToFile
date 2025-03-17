// Import jsPDF library dynamically when needed
let jsPDFScript = null;

// Create context menu items when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Create three simple menu items for selected text
  chrome.contextMenus.create({
    id: "saveAsPDF",
    title: "Save as PDF",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "saveAsTXT",
    title: "Save as TXT",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "saveAsMarkdown",
    title: "Save as Markdown",
    contexts: ["selection"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const menuId = info.menuItemId;
  const selectedText = info.selectionText;
  
  if (selectedText) {
    console.log(`Context menu clicked: ${menuId} with text length: ${selectedText.length}`);
    switch (menuId) {
      case "saveAsPDF":
        saveTextToFile(selectedText, 'pdf', tab);
        break;
      case "saveAsTXT":
        saveTextToFile(selectedText, 'txt');
        break;
      case "saveAsMarkdown":
        saveTextToFile(selectedText, 'markdown');
        break;
    }
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveText") {
    console.log(`Received saveText action for format: ${message.format}`);
    // If this is coming from popup and is a PDF, we need to get the active tab
    if (message.format === 'pdf') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          saveTextToFile(message.text, message.format, tabs[0])
            .then(() => sendResponse({ success: true }))
            .catch(error => {
              console.error("Error saving file:", error);
              sendResponse({ success: false, error: error.message });
            });
        } else {
          saveTextToFile(message.text, message.format)
            .then(() => sendResponse({ success: true }))
            .catch(error => {
              console.error("Error saving file:", error);
              sendResponse({ success: false, error: error.message });
            });
        }
      });
    } else {
      saveTextToFile(message.text, message.format)
        .then(() => sendResponse({ success: true }))
        .catch(error => {
          console.error("Error saving file:", error);
          sendResponse({ success: false, error: error.message });
        });
    }
    return true; // Keep the message channel open for the async response
  }
  return true;
});

// Function to dynamically load jsPDF
function loadJsPDF() {
  return new Promise((resolve, reject) => {
    // Check if jsPDF is already loaded
    if (window.jspdf) {
      resolve(window.jspdf.jsPDF);
      return;
    }
    
    // Use chrome.runtime.getURL to get the extension's file URL
    const jsPdfUrl = chrome.runtime.getURL('jspdf.umd.min.js');
    
    // Create script element and append to document
    if (!jsPDFScript) {
      jsPDFScript = document.createElement('script');
      jsPDFScript.src = jsPdfUrl;
      jsPDFScript.onload = () => {
        if (window.jspdf && window.jspdf.jsPDF) {
          resolve(window.jspdf.jsPDF);
        } else {
          reject(new Error('jsPDF loaded but jsPDF object not found'));
        }
      };
      jsPDFScript.onerror = () => reject(new Error('Failed to load jsPDF'));
      document.head.appendChild(jsPDFScript);
    } else {
      // Script already being loaded
      resolve(window.jspdf.jsPDF);
    }
  });
}

// Function to save text to file in different formats
async function saveTextToFile(text, format, tab) {
  if (!text) return Promise.reject(new Error('No text provided'));
  console.log(`Saving text as ${format}${tab ? ' with tab' : ' without tab'}`);

  let blob, filename;

  try {
    switch (format) {
      case 'pdf':
        if (tab && tab.id) {
          console.log(`Generating PDF in tab ${tab.id}`);
          // Use the new handlePDFGeneration function
          return handlePDFGeneration(text, tab)
            .then(pdfData => {
              // Download the PDF using the data URI
              return new Promise((resolve, reject) => {
                // Kiểm tra nếu đây là HTML thay vì PDF
                const isHtml = pdfData.startsWith('data:text/html');
                
                chrome.downloads.download({
                  url: pdfData,
                  filename: isHtml ? 'clipped_text.html' : 'clipped_text.pdf',
                  saveAs: true
                }, downloadId => {
                  if (chrome.runtime.lastError) {
                    console.error(`Download failed: ${chrome.runtime.lastError.message}`);
                    reject(new Error(`Download failed: ${chrome.runtime.lastError.message}`));
                  } else {
                    console.log(`Download started with id: ${downloadId}`);
                    resolve();
                  }
                });
              });
            })
            .catch(error => {
              console.error("Error generating PDF:", error);
              // Fallback to plain text if all else fails
              return generatePlainTextFile(text);
            });
        } else {
          console.log("No tab provided for PDF generation, using fallback");
          // Fallback: create a simple text file if tab is not available
          return generatePlainTextFile(text);
        }

      case 'txt':
        blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        filename = 'clipped_text.txt';
        break;
        
      case 'markdown':
        blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
        filename = 'clipped_text.md';
        break;
        
      default:
        return Promise.reject(new Error(`Unsupported format: ${format}`));
    }

    // If blob was created (for txt and markdown), convert to data URL and download
    if (blob) {
      return downloadBlobAsFile(blob, filename);
    }
  } catch (error) {
    console.error("Error in saveTextToFile:", error);
    return Promise.reject(error);
  }
}

// Helper function to create a simple text file
function generatePlainTextFile(text) {
  console.log("Using plain text file fallback");
  
  return new Promise((resolve, reject) => {
    try {
      // Giới hạn độ dài văn bản để tránh lỗi quota
      let processedText = text;
      const MAX_LENGTH = 2000;
      if (text.length > MAX_LENGTH) {
        processedText = text.substring(0, MAX_LENGTH) + "\n\n[Nội dung đã bị cắt ngắn do giới hạn dung lượng...]";
      }
      
      // Create a simple text blob
      const blob = new Blob([processedText], { type: 'text/plain;charset=utf-8' });
      
      // Download the file
      downloadBlobAsFile(blob, 'clipped_text.txt')
        .then(resolve)
        .catch(reject);
    } catch (error) {
      console.error("Error in generatePlainTextFile:", error);
      reject(error);
    }
  });
}

// Helper function to generate PDF in a tab
function generatePDFInTab(tabId, text, resolve, reject) {
  chrome.tabs.sendMessage(tabId, {
    action: "generatePDF",
    text: text
  }, response => {
    if (chrome.runtime.lastError) {
      console.error(`Error from content script: ${chrome.runtime.lastError.message}`);
      // Fallback to plain text PDF
      generatePlainTextPDF(text).then(resolve).catch(reject);
      return;
    }
    
    if (response && response.success) {
      console.log("PDF generated successfully in content script");
      // Download the PDF using the data URI
      chrome.downloads.download({
        url: response.pdfData,
        filename: 'clipped_text.pdf',
        saveAs: true
      }, downloadId => {
        if (chrome.runtime.lastError) {
          console.error(`Download failed: ${chrome.runtime.lastError.message}`);
          reject(new Error(`Download failed: ${chrome.runtime.lastError.message}`));
        } else {
          console.log(`PDF download started with id: ${downloadId}`);
          resolve();
        }
      });
    } else {
      console.error("PDF generation failed in content script");
      // Fallback to plain text PDF
      generatePlainTextPDF(text).then(resolve).catch(reject);
    }
  });
}

// Helper function to create a simple text-based PDF
function generatePlainTextPDF(text) {
  console.log("Using plain text PDF fallback");
  
  return new Promise((resolve, reject) => {
    try {
      // Create a simple text blob with PDF mime type
      const blob = new Blob([text], { type: 'application/pdf' });
      
      // Download the file
      downloadBlobAsFile(blob, 'clipped_text.pdf')
        .then(resolve)
        .catch(reject);
    } catch (error) {
      console.error("Error in generatePlainTextPDF:", error);
      reject(error);
    }
  });
}

// Helper function to download a blob as a file
function downloadBlobAsFile(blob, filename) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      chrome.downloads.download({
        url: reader.result,
        filename: filename,
        saveAs: true
      }, downloadId => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Download failed: ${chrome.runtime.lastError.message}`));
        } else {
          resolve();
        }
      });
    };
    reader.onerror = () => reject(new Error('Failed to read blob data'));
    reader.readAsDataURL(blob);
  });
}

// Function to convert blob to data URL
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Handle PDF generation
function handlePDFGeneration(text, tab) {
  return new Promise((resolve, reject) => {
    console.log("Sending generatePDF message to content script");
    
    // First check if content script is loaded
    chrome.tabs.sendMessage(tab.id, { action: "ping" }, function(response) {
      if (chrome.runtime.lastError) {
        console.log("Content script not loaded, injecting it first");
        
        // Inject content script if not already loaded
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).then(() => {
          // Wait a moment for the script to initialize
          setTimeout(() => {
            // Now try to generate PDF
            generatePDFWithContentScript(text, tab, resolve, reject);
          }, 500);
        }).catch(error => {
          console.error("Error injecting content script:", error);
          reject(new Error("Failed to inject content script: " + error.message));
        });
      } else {
        // Content script is already loaded, proceed with PDF generation
        generatePDFWithContentScript(text, tab, resolve, reject);
      }
    });
  });
}

function generatePDFWithContentScript(text, tab, resolve, reject) {
  // Giới hạn độ dài văn bản để tránh lỗi QUOTA_BYTES
  let processedText = text;
  const MAX_LENGTH = 2000;
  if (text.length > MAX_LENGTH) {
    processedText = text.substring(0, MAX_LENGTH) + "\n\n[Nội dung đã bị cắt ngắn do giới hạn dung lượng...]";
    console.log(`Text truncated from ${text.length} to ${MAX_LENGTH} characters to avoid quota issues`);
  }

  chrome.tabs.sendMessage(
    tab.id,
    { action: "generatePDF", text: processedText },
    function(response) {
      if (chrome.runtime.lastError) {
        console.error("Error in content script:", chrome.runtime.lastError);
        reject(new Error("Content script error: " + chrome.runtime.lastError.message));
        return;
      }
      
      if (!response) {
        console.error("No response from content script");
        reject(new Error("No response from content script"));
        return;
      }
      
      if (!response.success) {
        console.error("PDF generation failed in content script", response.error);
        reject(new Error(response.error || "Unknown error generating PDF"));
        return;
      }
      
      console.log("PDF generated successfully");
      
      // Kiểm tra nếu đây là HTML thay vì PDF
      if (response.isHtml) {
        console.log("Received HTML instead of PDF, downloading as HTML");
        // Tải trực tiếp HTML thay vì chuyển đổi thành PDF để tránh lỗi quota
        resolve(response.pdfData);
      } else {
        // Trả về PDF data URI như bình thường
        resolve(response.pdfData);
      }
    }
  );
} 