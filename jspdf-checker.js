// This script runs in the page context and checks for jsPDF
document.addEventListener('check-jspdf-loaded', function() {
  try {
    // Check if jspdf is available in the global scope
    let available = false;
    let jspdfObject = null;
    
    // Kiểm tra tất cả các cách mà jsPDF có thể được xuất ra
    if (typeof window.jspdf !== 'undefined') {
      available = true;
      jspdfObject = window.jspdf;
    } else if (typeof jspdf !== 'undefined') {
      available = true;
      jspdfObject = jspdf;
      // Đảm bảo jspdf cũng có sẵn trong window
      window.jspdf = jspdf;
    } else if (typeof window.jsPDF !== 'undefined') {
      available = true;
      jspdfObject = { jsPDF: window.jsPDF };
      // Đảm bảo jspdf cũng có sẵn trong window
      window.jspdf = jspdfObject;
    } else if (typeof jsPDF !== 'undefined') {
      available = true;
      jspdfObject = { jsPDF: jsPDF };
      // Đảm bảo jspdf cũng có sẵn trong window
      window.jspdf = jspdfObject;
    }
    
    // Kiểm tra thêm các biến toàn cục khác mà thư viện có thể sử dụng
    console.log("Available global variables:", Object.keys(window).filter(key => 
      key.toLowerCase().includes('pdf') || key.toLowerCase().includes('jspdf')));
    
    // Send the result back via a custom event
    const statusEvent = new CustomEvent('jspdf-status', {
      detail: {
        available: available,
        jspdfObject: jspdfObject
      }
    });
    
    document.dispatchEvent(statusEvent);
  } catch (error) {
    console.error("Error in jspdf-checker:", error);
    // Thông báo lỗi
    const errorEvent = new CustomEvent('jspdf-status', {
      detail: {
        available: false,
        error: error.toString()
      }
    });
    document.dispatchEvent(errorEvent);
  }
}); 