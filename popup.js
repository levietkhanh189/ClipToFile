document.addEventListener('DOMContentLoaded', () => {
  const textPreview = document.getElementById('textPreview');
  const saveAsPDFButton = document.getElementById('saveAsPDF');
  const saveAsTXTButton = document.getElementById('saveAsTXT');
  const saveAsMDButton = document.getElementById('saveAsMD');

  // Load clipboard text when popup opens
  loadClipboardText();

  // Set up button event listeners
  saveAsPDFButton.addEventListener('click', () => saveText('pdf'));
  saveAsTXTButton.addEventListener('click', () => saveText('txt'));
  saveAsMDButton.addEventListener('click', () => saveText('markdown'));

  // Function to load clipboard text using a fallback approach
  function loadClipboardText() {
    // First try using the fallback method with contentEditable and execCommand
    try {
      // Create a temporary contentEditable element
      const tempElement = document.createElement('div');
      tempElement.setAttribute('contenteditable', true);
      tempElement.style.position = 'absolute';
      tempElement.style.left = '-9999px';
      document.body.appendChild(tempElement);
      
      // Focus the element and execute paste command
      tempElement.focus();
      const success = document.execCommand('paste');
      
      if (success) {
        const text = tempElement.innerText;
        textPreview.value = text;
        document.body.removeChild(tempElement);
      } else {
        // If execCommand fails, show a message and provide instructions
        textPreview.value = 'To use clipboard: click here, press Ctrl+V (or Cmd+V) to paste content manually.';
        // Allow manual pasting
        textPreview.focus();
      }
      document.body.removeChild(tempElement);
    } catch (error) {
      console.error('Failed to read clipboard:', error);
      textPreview.value = 'To use clipboard: click here, press Ctrl+V (or Cmd+V) to paste content manually.';
      // Allow manual pasting
      textPreview.focus();
    }
  }

  // Function to save text in selected format
  function saveText(format) {
    const text = textPreview.value.trim();
    
    if (!text) {
      alert('No text to save. Please copy some text first.');
      return;
    }

    // Show feedback immediately
    showSaveFeedback(format);

    if (format === 'pdf') {
      // Always try content script first for PDF generation
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          tryContentScriptPDF(text, tabs[0].id);
        } else {
          // Fallback to background script if no active tab
          useBackgroundScriptForPDF(text);
        }
      });
    } else {
      // For other formats, use background script
      chrome.runtime.sendMessage(
        {
          action: 'saveText',
          text: text,
          format: format
        },
        (response) => {
          if (!response || !response.success) {
            console.error(`Error saving as ${format}:`, response?.error || 'Unknown error');
            showErrorFeedback(format);
          }
        }
      );
    }
  }
  
  // Function to try generating PDF via content script
  function tryContentScriptPDF(text, tabId) {
    // Inject content script
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to inject content script:', chrome.runtime.lastError);
        useBackgroundScriptForPDF(text);
        return;
      }
      
      // Generate PDF using content script
      chrome.tabs.sendMessage(tabId, {
        action: 'generatePDF',
        text: text
      }, response => {
        if (chrome.runtime.lastError || !response || !response.success) {
          console.error('PDF generation failed:', 
                      chrome.runtime.lastError || response?.error || 'Unknown error');
          useBackgroundScriptForPDF(text);
          return;
        }
        
        // Download the generated PDF
        chrome.downloads.download({
          url: response.pdfData,
          filename: 'clipped_text.pdf',
          saveAs: true
        }, downloadId => {
          if (chrome.runtime.lastError) {
            console.error('Failed to download PDF:', chrome.runtime.lastError);
            showErrorFeedback('pdf');
          }
        });
      });
    });
  }
  
  // Function to use background script for PDF generation
  function useBackgroundScriptForPDF(text) {
    chrome.runtime.sendMessage(
      {
        action: 'saveText',
        text: text,
        format: 'pdf'
      },
      (response) => {
        if (!response || !response.success) {
          console.error("Background PDF generation failed:", response?.error || 'Unknown error');
          showErrorFeedback('pdf');
        }
      }
    );
  }
  
  // Helper function to show save feedback
  function showSaveFeedback(format) {
    // Remove any existing feedback first
    const existingFeedback = document.querySelector('.save-feedback');
    if (existingFeedback) {
      document.body.removeChild(existingFeedback);
    }
    
    const savedFeedback = document.createElement('div');
    savedFeedback.textContent = `Saving as ${format.toUpperCase()}...`;
    savedFeedback.className = 'save-feedback';
    document.body.appendChild(savedFeedback);
    
    // Feedback will be removed after 2 seconds or when replaced by error feedback
    setTimeout(() => {
      if (document.body.contains(savedFeedback)) {
        document.body.removeChild(savedFeedback);
      }
    }, 2000);
  }
  
  // Helper function to show error feedback
  function showErrorFeedback(format) {
    // Remove any existing feedback first
    const existingFeedback = document.querySelector('.save-feedback');
    if (existingFeedback) {
      document.body.removeChild(existingFeedback);
    }
    
    const errorFeedback = document.createElement('div');
    errorFeedback.textContent = `Error saving as ${format.toUpperCase()}. Please try again.`;
    errorFeedback.className = 'save-feedback error';
    document.body.appendChild(errorFeedback);
    
    // Remove error feedback after 3 seconds
    setTimeout(() => {
      if (document.body.contains(errorFeedback)) {
        document.body.removeChild(errorFeedback);
      }
    }, 3000);
  }
}); 