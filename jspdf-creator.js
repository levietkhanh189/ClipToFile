// Script này chạy trong ngữ cảnh trang web để tạo PDF với jsPDF
(function() {
  // Lắng nghe sự kiện yêu cầu tạo PDF
  document.addEventListener('create-pdf', function(event) {
    try {
      const text = event.detail.text;
      
      // Kiểm tra xem jsPDF đã được tải chưa
      if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF !== 'function') {
        console.error("jsPDF not available for PDF creation");
        document.dispatchEvent(new CustomEvent('pdf-created', {
          detail: {
            success: false,
            error: "jsPDF not available"
          }
        }));
        return;
      }
      
      console.log("Creating PDF with jsPDF");
      
      // Lấy constructor jsPDF
      const { jsPDF } = window.jspdf;
      
      // Tạo một instance mới của jsPDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        putOnlyUsedFonts: true,
        compress: true,
        hotfixes: ["px_scaling"]
      });
      
      // Thiết lập định dạng tài liệu
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const fontSize = 9;
      const lineHeight = 5;
      
      // Cấu hình hiển thị văn bản
      doc.setFontSize(fontSize);
      doc.setTextColor(0, 0, 0);
      doc.setFont('courier', 'normal');
      
      // Tính toán chiều rộng có sẵn cho văn bản
      const maxWidth = pageWidth - (2 * margin);
      
      // Thêm metadata tối thiểu
      doc.setProperties({
        title: 'PDF'
      });

      // Giới hạn độ dài văn bản
      let processedText = text;
      const MAX_LENGTH = 2700;
      if (text.length > MAX_LENGTH) {
        processedText = text.substring(0, MAX_LENGTH) + "\n\n[Nội dung đã bị cắt ngắn...]";
        console.log(`Text truncated from ${text.length} to ${MAX_LENGTH} characters`);
      }

      // Chia văn bản thành các dòng phù hợp với chiều rộng trang
      const textLines = doc.splitTextToSize(processedText, maxWidth);
      
      // Tính toán phân trang
      const linesPerPage = Math.floor((pageHeight - (2 * margin)) / lineHeight);
      const totalPages = Math.ceil(textLines.length / linesPerPage);
      
      // Giới hạn số trang
      const MAX_PAGES = 4;
      const actualPages = Math.min(totalPages, MAX_PAGES);
      
      if (actualPages < totalPages) {
        console.log(`Pages limited from ${totalPages} to ${MAX_PAGES}`);
      }
      
      // Thêm nội dung từng trang
      for (let i = 0; i < actualPages; i++) {
        if (i > 0) {
          doc.addPage();
        }
        
        // Tính toán các dòng cho trang này
        const startLine = i * linesPerPage;
        const endLine = Math.min((i + 1) * linesPerPage, textLines.length);
        const pageLines = textLines.slice(startLine, endLine);
        
        // Thêm văn bản vào trang với lề thích hợp
        doc.text(pageLines, margin, margin + fontSize, {
          baseline: 'top',
          maxWidth: maxWidth,
          lineHeightFactor: 1.1
        });
        
        // Thêm số trang
        if (i === actualPages - 1) {
          doc.setFontSize(7);
          doc.text(`${i + 1}/${actualPages}`, pageWidth/2, pageHeight - 10, {
            align: 'center'
          });
        }
      }
      
      // Sử dụng cấu hình nén tối đa để giảm kích thước PDF
      const pdfOptions = {
        compress: true,
        precision: 2,
        putOnlyUsedFonts: true
      };
      
      // Lấy PDF dưới dạng data URI với nén
      const pdfData = doc.output('datauristring', pdfOptions);
      const pdfSize = Math.round(pdfData.length/1024);
      console.log(`PDF generated successfully with size approximately ${pdfSize} KB`);
      
      // Gửi kết quả về
      document.dispatchEvent(new CustomEvent('pdf-created', {
        detail: {
          success: true,
          pdfData: pdfData,
          pdfSize: pdfSize
        }
      }));
    } catch (error) {
      console.error("Error creating PDF:", error);
      document.dispatchEvent(new CustomEvent('pdf-created', {
        detail: {
          success: false,
          error: error.toString()
        }
      }));
    }
  });
})(); 