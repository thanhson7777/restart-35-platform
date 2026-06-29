import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Xuất dữ liệu ra file Excel với định dạng độ rộng cột tự động
 */
export const exportToExcel = (data, filename, headersMap) => {
  if (!data || !data.length) return;
  
  const headers = Object.keys(headersMap);
  const sheetData = data.map(row => {
    const newRow = {};
    headers.forEach(h => {
      let value = row[h];
      newRow[headersMap[h]] = value; 
    });
    return newRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetData);
  
  // Auto-width: Tính toán độ rộng tối đa cho từng cột
  const cols = headers.map(h => {
    const maxLen = Math.max(
      headersMap[h].length,
      ...data.map(row => (row[h] ? row[h].toString().length : 0))
    );
    return { wch: Math.min(maxLen + 2, 50) }; // Giới hạn max width = 50
  });
  worksheet['!cols'] = cols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Xuất dữ liệu ra file PDF có hỗ trợ Tiếng Việt và styling
 */
export const exportToPDF = async (data, filename, headersMap, title) => {
  if (!data || !data.length) return;
  const doc = new jsPDF();

  try {
    // Tải font Roboto từ Google Fonts CDN để hỗ trợ Tiếng Việt
    const fontUrl = 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf';
    const response = await fetch(fontUrl);
    const buffer = await response.arrayBuffer();
    
    // Chuyển array buffer sang base64
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64Font = btoa(binary);

    // Đăng ký font vào jsPDF
    doc.addFileToVFS('Roboto-Regular.ttf', base64Font);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto');
  } catch (err) {
    console.warn('Could not load Roboto font for PDF, using default', err);
  }
  
  const headers = Object.keys(headersMap);
  const tableHeaders = [headers.map(h => headersMap[h])];
  const tableData = data.map(row => headers.map(h => row[h] ? row[h].toString() : ''));

  // Tiêu đề
  doc.setFontSize(16);
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.text(title, pageWidth / 2, 15, { align: 'center' });

  // Bảng dữ liệu
  autoTable(doc, {
    startY: 25,
    head: tableHeaders,
    body: tableData,
    styles: { 
      font: 'Roboto', 
      fontStyle: 'normal',
      fontSize: 10
    },
    headStyles: { 
      fillColor: [16, 185, 129], // Emerald 500
      textColor: 255,
      halign: 'center'
    },
    theme: 'grid'
  });
  
  doc.save(`${filename}.pdf`);
};
