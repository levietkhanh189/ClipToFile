// Script này chạy trong ngữ cảnh trang web để tải jsPDF
(function() {
  // Kiểm tra xem jsPDF đã được tải chưa
  if (typeof window.jsPDF !== 'undefined') {
    console.log("jsPDF already loaded");
    window.jspdf = { jsPDF: window.jsPDF };
    
    // Thông báo rằng jsPDF đã được tải
    document.dispatchEvent(new CustomEvent('jspdf-loaded-status', {
      detail: {
        available: true,
        jspdfObject: window.jspdf
      }
    }));
    return;
  }
  
  // Lắng nghe sự kiện từ content script
  document.addEventListener('load-jspdf', function(event) {
    try {
      const scriptUrl = event.detail.scriptUrl;
      
      // Tải script jsPDF
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.type = 'text/javascript';
      
      script.onload = function() {
        console.log("jsPDF script loaded in page context");
        
        // Đợi một chút để đảm bảo script được thực thi
        setTimeout(() => {
          // Kiểm tra các biến toàn cục có thể chứa jsPDF
          if (typeof window.jsPDF !== 'undefined') {
            console.log("Found jsPDF in window.jsPDF");
            window.jspdf = { jsPDF: window.jsPDF };
          } else if (typeof jsPDF !== 'undefined') {
            console.log("Found jsPDF in global jsPDF");
            window.jspdf = { jsPDF: jsPDF };
          } else if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') {
            console.log("Found jsPDF in window.jspdf.jsPDF");
            // Đã có sẵn, không cần làm gì
          } else {
            // Tìm kiếm trong tất cả các biến toàn cục
            const pdfKeys = Object.keys(window).filter(key => 
              key.toLowerCase().includes('pdf') || key.toLowerCase().includes('jspdf'));
            
            console.log("Potential jsPDF keys:", pdfKeys);
            
            // Kiểm tra xem có biến nào chứa jsPDF không
            let found = false;
            for (const key of pdfKeys) {
              if (typeof window[key] === 'function' && window[key].toString().includes('jsPDF')) {
                console.log(`Found jsPDF in window.${key}`);
                window.jspdf = { jsPDF: window[key] };
                found = true;
                break;
              }
            }
            
            if (!found) {
              console.error("jsPDF not found after loading");
            }
          }
          
          // Thông báo rằng jsPDF đã được tải
          document.dispatchEvent(new CustomEvent('jspdf-loaded-status', {
            detail: {
              available: typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined',
              jspdfObject: window.jspdf
            }
          }));
        }, 500);
      };
      
      script.onerror = function(error) {
        console.error("Error loading jsPDF in page context:", error);
        document.dispatchEvent(new CustomEvent('jspdf-loaded-status', {
          detail: {
            available: false,
            error: "Failed to load jsPDF script"
          }
        }));
      };
      
      document.head.appendChild(script);
    } catch (error) {
      console.error("Error in jspdf-loader:", error);
      document.dispatchEvent(new CustomEvent('jspdf-loaded-status', {
        detail: {
          available: false,
          error: error.toString()
        }
      }));
    }
  });
})(); 