import React, { useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface ExtractedData {
  name: string;
  score: number;
  bowType: string;
  distance: string;
  date: string;
}

interface PDFQRExtractorProps {
  pdfBase64: string;
  onComplete: (results: ExtractedData[]) => void;
  onError: (error: string) => void;
}

const PDF_QR_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>
</head>
<body>
  <canvas id="canvas" style="display:none;"></canvas>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    async function extractQRFromPDF(base64Data) {
      const results = [];
      
      try {
        // Convert base64 to Uint8Array
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Load PDF
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        
        // Process each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          
          // Render at higher scale for better QR detection
          const scale = 2.0;
          const viewport = page.getViewport({ scale });
          
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          await page.render({
            canvasContext: ctx,
            viewport: viewport
          }).promise;
          
          // Get image data and scan for QR codes
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (qrCode) {
            try {
              const data = JSON.parse(qrCode.data);
              if (data.t === 'arrow_tracker') {
                results.push({
                  name: data.n || 'Unknown',
                  score: data.s || 0,
                  bowType: data.b || 'Unknown',
                  distance: data.d || '',
                  date: data.dt || ''
                });
              }
            } catch (e) {
              // Not a valid Arrow Tracker QR code, skip
            }
          }
        }
        
        return { success: true, results };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
    
    // Listen for messages from React Native
    window.addEventListener('message', async (event) => {
      const { action, pdfBase64 } = JSON.parse(event.data);
      
      if (action === 'extract') {
        const result = await extractQRFromPDF(pdfBase64);
        window.ReactNativeWebView.postMessage(JSON.stringify(result));
      }
    });
    
    // Also handle for Android
    document.addEventListener('message', async (event) => {
      const { action, pdfBase64 } = JSON.parse(event.data);
      
      if (action === 'extract') {
        const result = await extractQRFromPDF(pdfBase64);
        window.ReactNativeWebView.postMessage(JSON.stringify(result));
      }
    });
    
    // Signal ready
    window.ReactNativeWebView.postMessage(JSON.stringify({ ready: true }));
  </script>
</body>
</html>
`;

export const PDFQRExtractor: React.FC<PDFQRExtractorProps> = ({
  pdfBase64,
  onComplete,
  onError,
}) => {
  const webViewRef = useRef<WebView>(null);
  const hasProcessed = useRef(false);

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.ready && !hasProcessed.current && pdfBase64) {
        hasProcessed.current = true;
        // Send PDF to WebView for processing
        webViewRef.current?.postMessage(JSON.stringify({
          action: 'extract',
          pdfBase64: pdfBase64,
        }));
      } else if (data.success !== undefined) {
        if (data.success) {
          onComplete(data.results || []);
        } else {
          onError(data.error || 'Failed to extract QR codes');
        }
      }
    } catch (e: any) {
      onError(e.message || 'Error processing response');
    }
  }, [pdfBase64, onComplete, onError]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: PDF_QR_HTML }}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 1,
    height: 1,
    opacity: 0,
    position: 'absolute',
  },
  webview: {
    width: 1,
    height: 1,
  },
});

export default PDFQRExtractor;
