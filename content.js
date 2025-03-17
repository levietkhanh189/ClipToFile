// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getClipboardText") {
    // Method 1: Try to use navigator.clipboard API if permissions allow
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText()
        .then(text => {
          sendResponse({ clipboardText: text });
        })
        .catch(error => {
          console.error("Error reading clipboard:", error);
          
          // Method 2: Fallback to execCommand
          try {
            const activeElement = document.activeElement;
            const tempInput = document.createElement('textarea');
            tempInput.style.position = 'fixed';
            tempInput.style.opacity = '0';
            document.body.appendChild(tempInput);
            tempInput.focus();
            
            const success = document.execCommand('paste');
            const clipText = success ? tempInput.value : '';
            
            document.body.removeChild(tempInput);
            if (activeElement) activeElement.focus();
            
            sendResponse({ clipboardText: clipText });
          } catch (err) {
            console.error("Fallback clipboard method failed:", err);
            sendResponse({ clipboardText: '', error: 'Failed to access clipboard' });
          }
        });
      return true; // Keep the message channel open for the async response
    } 
    // If navigator.clipboard is not available, try execCommand directly
    else {
      try {
        const activeElement = document.activeElement;
        const tempInput = document.createElement('textarea');
        tempInput.style.position = 'fixed';
        tempInput.style.opacity = '0';
        document.body.appendChild(tempInput);
        tempInput.focus();
        
        const success = document.execCommand('paste');
        const clipText = success ? tempInput.value : '';
        
        document.body.removeChild(tempInput);
        if (activeElement) activeElement.focus();
        
        sendResponse({ clipboardText: clipText });
      } catch (err) {
        console.error("execCommand clipboard method failed:", err);
        sendResponse({ clipboardText: '', error: 'Failed to access clipboard' });
      }
    }
  }
  
  if (message.action === "getSelectedText") {
    // Get selected text from the page
    const selectedText = window.getSelection().toString();
    sendResponse({ selectedText: selectedText });
    return true;
  }
  
  if (message.action === "generatePDF") {
    console.log("Received generatePDF action");
    // Always inject jsPDF to ensure it's available
    injectJsPDF().then(() => {
      console.log("jsPDF injected successfully, generating PDF");
      generatePDF(message.text, sendResponse);
    }).catch(error => {
      console.error("Error injecting jsPDF:", error);
      sendResponse({ success: false, error: error.toString() });
    });
    return true; // Keep the message channel open for the async response
  }

  if (message.action === "ping") {
    // Simple ping to check if content script is loaded
    sendResponse({ status: "ok" });
    return true;
  }
  
  if (message.action === "printToPDF") {
    console.log("Received printToPDF action");
    // Sử dụng window.print() để in trang thành PDF
    try {
      // Tạo một iframe ẩn để in mà không ảnh hưởng đến trang hiện tại
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      // Đợi iframe load xong
      iframe.onload = function() {
        try {
          // Thực hiện in
          iframe.contentWindow.print();
          
          // Trả về thành công
          sendResponse({ success: true });
        } catch (error) {
          console.error("Error printing to PDF:", error);
          sendResponse({ success: false, error: error.toString() });
        } finally {
          // Xóa iframe
          document.body.removeChild(iframe);
        }
      };
      
      // Tải nội dung hiện tại vào iframe
      iframe.src = window.location.href;
    } catch (error) {
      console.error("Error setting up print:", error);
      sendResponse({ success: false, error: error.toString() });
    }
    return true;
  }
});

// Function to inject jsPDF into the page
function injectJsPDF() {
  return new Promise((resolve, reject) => {
    try {
      // Check if jsPDF is already available in window context
      if (typeof window.jspdf !== 'undefined') {
        console.log("jsPDF is already available");
        resolve();
        return;
      }
      
      console.log("Loading jsPDF script");
      
      // Get the URL to the jsPDF script
      const scriptUrl = chrome.runtime.getURL('jspdf.umd.min.js');
      const loaderUrl = chrome.runtime.getURL('jspdf-loader.js');
      
      // Tải jspdf-loader.js trước
      const loaderScript = document.createElement('script');
      loaderScript.src = loaderUrl;
      loaderScript.type = 'text/javascript';
      
      loaderScript.onload = function() {
        console.log("jsPDF loader script loaded successfully");
        
        // Lắng nghe sự kiện jsPDF được tải
        document.addEventListener('jspdf-loaded-status', function loadedStatusHandler(event) {
          document.removeEventListener('jspdf-loaded-status', loadedStatusHandler);
          
          if (event.detail && event.detail.available) {
            console.log("jsPDF is now available via loader");
            window.jspdf = event.detail.jspdfObject;
            resolve();
          } else {
            console.error("jsPDF not found after loading via loader:", event.detail?.error);
            
            // Thử phương pháp cũ
            fallbackLoadJsPDF(scriptUrl, resolve, reject);
          }
        });
        
        // Gửi sự kiện để tải jsPDF
        document.dispatchEvent(new CustomEvent('load-jspdf', {
          detail: {
            scriptUrl: scriptUrl
          }
        }));
        
        // Đặt timeout để tránh treo
        setTimeout(() => {
          console.log("Timeout waiting for jsPDF loader response");
          fallbackLoadJsPDF(scriptUrl, resolve, reject);
        }, 3000);
      };
      
      loaderScript.onerror = function(error) {
        console.error("Error loading jsPDF loader:", error);
        fallbackLoadJsPDF(scriptUrl, resolve, reject);
      };
      
      // Add the loader script to the document
      document.head.appendChild(loaderScript);
      
    } catch (error) {
      console.error("Error in injectJsPDF:", error);
      reject(error);
    }
  });
}

// Phương pháp dự phòng để tải jsPDF
function fallbackLoadJsPDF(scriptUrl, resolve, reject) {
  try {
    console.log("Using fallback method to load jsPDF");
    
    // Tạo một script element để tải jsPDF trực tiếp
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.type = 'text/javascript';
    
    // Thiết lập sự kiện onload
    script.onload = function() {
      console.log("jsPDF script loaded via fallback method");
      
      // Kiểm tra xem jsPDF đã được định nghĩa chưa
      setTimeout(() => {
        // Kiểm tra các biến toàn cục có thể chứa jsPDF
        if (typeof window.jsPDF !== 'undefined') {
          console.log("Found jsPDF in window.jsPDF via fallback");
          window.jspdf = { jsPDF: window.jsPDF };
          resolve();
        } else if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF === 'function') {
          console.log("Found jsPDF in window.jspdf.jsPDF via fallback");
          resolve();
        } else {
          // Thử tìm kiếm trong tất cả các biến toàn cục
          const pdfKeys = Object.keys(window).filter(key => 
            key.toLowerCase().includes('pdf') || key.toLowerCase().includes('jspdf'));
          
          console.log("Potential jsPDF keys via fallback:", pdfKeys);
          
          // Kiểm tra từng key
          let found = false;
          for (const key of pdfKeys) {
            if (typeof window[key] === 'function' && window[key].toString().includes('jsPDF')) {
              console.log(`Found jsPDF in window.${key} via fallback`);
              window.jspdf = { jsPDF: window[key] };
              found = true;
              break;
            }
          }
          
          if (found) {
            resolve();
          } else {
            console.error("jsPDF not found after fallback loading");
            reject(new Error("Failed to find jsPDF after fallback loading"));
          }
        }
      }, 500); // Đợi một chút để đảm bảo script được thực thi
    };
    
    script.onerror = function(error) {
      console.error("Error loading jsPDF via fallback:", error);
      reject(new Error("Failed to load jsPDF script via fallback"));
    };
    
    // Thêm script vào document
    document.head.appendChild(script);
    
    // Đặt timeout để tránh treo
    setTimeout(() => {
      reject(new Error("Timeout loading jsPDF via fallback"));
    }, 5000);
  } catch (directError) {
    console.error("Error in fallback method:", directError);
    reject(new Error("Failed to find jsPDF after loading"));
  }
}

// Function to generate PDF with jsPDF
function generatePDF(text, sendResponse) {
  try {
    console.log("Starting PDF generation");
    
    // If jsPDF is not available in window context, try to inject it
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF !== 'function') {
      console.log("jsPDF not available in window context, injecting it first");
      
      // Inject jsPDF first
      injectJsPDF()
        .then(() => {
          console.log("jsPDF injected successfully, now creating PDF");
          if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF === 'function') {
            createPDF(window.jspdf.jsPDF, text, sendResponse);
          } else {
            console.error("jsPDF injected but not in expected format");
            createSimplePDF(text, sendResponse);
          }
        })
        .catch(error => {
          console.error("Error injecting jsPDF:", error);
          createSimplePDF(text, sendResponse);
        });
    } else {
      console.log("Using jsPDF from window context");
      createPDF(window.jspdf.jsPDF, text, sendResponse);
    }
  } catch (error) {
    console.error("Error in generatePDF:", error);
    // Fallback to simple PDF if any error occurs
    createSimplePDF(text, sendResponse);
  }
}

// Separate function to create the PDF
function createPDF(jsPDF, text, sendResponse) {
  try {
    console.log("Creating PDF using jspdf-creator.js");
    
    // Tải script jspdf-creator.js
    const creatorUrl = chrome.runtime.getURL('jspdf-creator.js');
    const creatorScript = document.createElement('script');
    creatorScript.src = creatorUrl;
    creatorScript.type = 'text/javascript';
    
    // Lắng nghe sự kiện PDF được tạo
    document.addEventListener('pdf-created', function pdfCreatedHandler(event) {
      document.removeEventListener('pdf-created', pdfCreatedHandler);
      
      if (event.detail && event.detail.success) {
        console.log(`PDF created successfully with size ${event.detail.pdfSize} KB`);
        sendResponse({ success: true, pdfData: event.detail.pdfData });
      } else {
        console.error("Error creating PDF:", event.detail?.error);
        // Fallback to simple PDF if jsPDF fails
        createSimplePDF(text, sendResponse);
      }
    }, { once: true });
    
    // Thiết lập sự kiện onload
    creatorScript.onload = function() {
      console.log("PDF creator script loaded successfully");
      
      // Gửi sự kiện để tạo PDF
      document.dispatchEvent(new CustomEvent('create-pdf', {
        detail: {
          text: text
        }
      }));
    };
    
    creatorScript.onerror = function(error) {
      console.error("Error loading PDF creator script:", error);
      // Fallback to simple PDF if script fails to load
      createSimplePDF(text, sendResponse);
    };
    
    // Thêm script vào document
    document.head.appendChild(creatorScript);
    
    // Đặt timeout để tránh treo
    setTimeout(() => {
      console.log("Timeout waiting for PDF creation");
      createSimplePDF(text, sendResponse);
    }, 5000);
  } catch (error) {
    console.error("Error in createPDF:", error);
    // Fallback to simple PDF if any error occurs
    createSimplePDF(text, sendResponse);
  }
}

// Fallback function to create a very simple PDF without jsPDF
function createSimplePDF(text, sendResponse) {
  try {
    console.log("Using simple PDF fallback method");
    
    // Giới hạn độ dài văn bản
    let processedText = text;
    const MAX_LENGTH = 2000; // Giảm giới hạn xuống 2000 ký tự để tránh lỗi quota
    if (text.length > MAX_LENGTH) {
      processedText = text.substring(0, MAX_LENGTH) + "\n\n[Nội dung đã bị cắt ngắn...]";
    }
    
    // Tạo HTML đơn giản với font mặc định của Chrome
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>PDF</title><style>body{font-family:monospace;margin:20mm;font-size:9pt}pre{white-space:pre-wrap;word-wrap:break-word;font-family:monospace}</style></head><body><pre>${processedText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`;
    
    // Chuyển đổi HTML thành data URI
    const dataUri = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
    
    // Gửi data URI để tải xuống
    sendResponse({ success: true, pdfData: dataUri, isHtml: true });
    
  } catch (error) {
    console.error("Error creating simple PDF:", error);
    // Nếu vẫn lỗi, trả về lỗi để hiển thị cho người dùng
    sendResponse({ success: false, error: "Không thể tạo PDF do giới hạn dung lượng. Vui lòng giảm độ dài văn bản." });
  }
}