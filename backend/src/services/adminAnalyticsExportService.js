import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'
import { adminAnalyticsService } from './adminAnalyticsService'

export const exportExcel = async (tab = 'overview', startDate, endDate) => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Restart 35+'
  workbook.created = new Date()

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet('Tổng quan', { views: [{ showGridLines: false }] })
  
  // Set column widths without creating a header row
  summarySheet.getColumn(1).width = 30;
  summarySheet.getColumn(2).width = 30;

  // Row 1: Main Title
  const titleRow = summarySheet.addRow(['BÁO CÁO THỐNG KÊ']);
  titleRow.height = 30;
  titleRow.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
  summarySheet.mergeCells('A1:B1');
  summarySheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  
  summarySheet.addRow([])

  const dateRow = summarySheet.addRow(['Ngày xuất:', new Date().toLocaleDateString('vi-VN')])
  dateRow.font = { italic: true }
  
  let dateText = 'Tất cả thời gian'
  if (startDate && endDate) {
    dateText = `${new Date(parseInt(startDate)).toLocaleDateString('vi-VN')} - ${new Date(parseInt(endDate)).toLocaleDateString('vi-VN')}`
  }
  const periodRow = summarySheet.addRow(['Giai đoạn:', dateText])
  periodRow.font = { italic: true }
  
  summarySheet.addRow([])

  if (tab === 'users') {
    const data = await adminAnalyticsService.getUsersAnalytics(startDate, endDate);
    
    summarySheet.getCell('A1').value = 'BÁO CÁO NGƯỜI DÙNG & ĐỐI TÁC'
    
    const overviewTitle = summarySheet.addRow(['TỔNG QUAN HỆ THỐNG', '']);
    summarySheet.mergeCells(`A${overviewTitle.number}:B${overviewTitle.number}`);
    overviewTitle.font = { bold: true, color: { argb: 'FF1E3A8A' } };
    overviewTitle.getCell(1).border = { bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } } };
    summarySheet.addRow([])

    const addMetric = (label, value) => {
      const row = summarySheet.addRow([label, value]);
      row.getCell(2).font = { bold: true };
      row.getCell(2).alignment = { horizontal: 'left' };
    }

    addMetric('Tổng người dùng', data.overview.totalUsers)
    addMetric('Người lao động', data.overview.totalWorkers)
    addMetric('Doanh nghiệp', data.overview.totalEnterprises)
    addMetric('Trung tâm đào tạo', data.overview.totalTrainers)
    addMetric('Tổ chức NGO', data.overview.totalNGOs)

    const rawSheet = workbook.addWorksheet('Dữ liệu chi tiết')
    rawSheet.columns = [
      { header: 'Người dùng', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Vai trò', key: 'role', width: 20 },
      { header: 'SĐT', key: 'phone', width: 15 },
      { header: 'Ngày tạo', key: 'createdAt', width: 20 }
    ]

    rawSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    rawSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }
    rawSheet.views = [{ state: 'frozen', ySplit: 1 }]
    rawSheet.autoFilter = 'A1:E1'

    data.recentUsers.forEach(u => {
      rawSheet.addRow({
        name: u.displayName,
        email: u.email,
        role: u.role,
        phone: u.phone || 'N/A',
        createdAt: new Date(u.createdAt).toLocaleDateString('vi-VN')
      })
    })

    rawSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
      }
    })

  } else if (tab === 'courses') {
    // Map dates to timeRange for backward compatibility with service
    let timeRange = 'ALL'
    summarySheet.getCell('A1').value = 'BÁO CÁO ĐÀO TẠO'
    const data = await adminAnalyticsService.getTrainingAnalytics(timeRange)
    
    const overviewTitle = summarySheet.addRow(['TỔNG QUAN', '']);
    summarySheet.mergeCells(`A${overviewTitle.number}:B${overviewTitle.number}`);
    overviewTitle.font = { bold: true, color: { argb: 'FF1E3A8A' } };
    overviewTitle.getCell(1).border = { bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } } };
    summarySheet.addRow([])

    const addMetric = (label, value) => {
      const row = summarySheet.addRow([label, value]);
      row.getCell(2).font = { bold: true };
      row.getCell(2).alignment = { horizontal: 'left' };
    }

    addMetric('Tổng số khóa học', data.tables?.coursesTable?.length || 0)
    
    const rawSheet = workbook.addWorksheet('Dữ liệu Khóa học')
    rawSheet.columns = [
      { header: 'Khóa học', key: 'title', width: 40 },
      { header: 'Nhà cung cấp', key: 'providerName', width: 30 },
      { header: 'Số lượng HV', key: 'enrollmentCount', width: 15 },
      { header: 'Học phí', key: 'fee', width: 15, style: { numFmt: '#,##0 "đ"' } },
      { header: 'Trạng thái', key: 'status', width: 15 }
    ]

    rawSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    rawSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }
    rawSheet.views = [{ state: 'frozen', ySplit: 1 }]

    const coursesTable = data.tables?.coursesTable || []
    coursesTable.forEach(c => {
      rawSheet.addRow({
        title: c.title,
        providerName: c.providerName,
        enrollmentCount: c.enrollmentCount || 0,
        fee: c.fee || 0,
        status: c.status
      })
    })

    rawSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
      }
    })

  } else {
    // Default: Overview
    summarySheet.getCell('A1').value = 'BÁO CÁO TỔNG QUAN HỆ THỐNG'
    const data = await adminAnalyticsService.getDashboardOverview(startDate, endDate)
    
    const overviewTitle = summarySheet.addRow(['CHỈ SỐ CHÍNH', '']);
    summarySheet.mergeCells(`A${overviewTitle.number}:B${overviewTitle.number}`);
    overviewTitle.font = { bold: true, color: { argb: 'FF1E3A8A' } };
    overviewTitle.getCell(1).border = { bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } } };
    summarySheet.addRow([])

    const addMetric = (label, value, isCurrency = false) => {
      const row = summarySheet.addRow([label, value]);
      row.getCell(2).font = { bold: true };
      row.getCell(2).alignment = { horizontal: 'left' };
      if (isCurrency) {
        row.getCell(2).numFmt = '#,##0 "đ"';
      }
    }

    addMetric('Tổng người dùng', data.totalUsers)
    addMetric('Tổng khóa học hoạt động', data.activeCourses)
    addMetric('Tổng việc làm đang tuyển', data.activeJobs)
    addMetric('Doanh thu trong kỳ', data.monthlyRevenue, true)
  }

  return await workbook.xlsx.writeBuffer()
}

export const exportPdf = async (tab = 'overview', startDate, endDate) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 })
      const buffers = []
      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => resolve(Buffer.concat(buffers)))

      // Standard Fonts
      try {
        doc.registerFont('Arial', 'C:/Windows/Fonts/Arial.ttf')
        doc.registerFont('Arial-Bold', 'C:/Windows/Fonts/Arialbd.ttf')
        doc.font('Arial')
      } catch (e) {
        // Fallback if fonts not found
      }

      // Header
      doc.font('Arial-Bold').fontSize(20).fillColor('#1e3a8a').text('RESTART 35+ REPORT')
      doc.font('Arial').fontSize(12).fillColor('#64748b').text('Nền tảng hỗ trợ đào tạo & tái lập nghiệp')
      doc.moveDown(2)

      doc.font('Arial-Bold').fontSize(16).fillColor('#0f172a').text(`BÁO CÁO TỔNG HỢP: ${tab.toUpperCase()}`)
      
      let dateText = 'Tất cả thời gian'
      if (startDate && endDate) {
        dateText = `${new Date(parseInt(startDate)).toLocaleDateString('vi-VN')} - ${new Date(parseInt(endDate)).toLocaleDateString('vi-VN')}`
      }
      doc.font('Arial').fontSize(10).text(`Thời gian: ${dateText}`)
      doc.moveDown(2)

      // Fetch Data
      let summaryData = []
      if (tab === 'users') {
        const data = await adminAnalyticsService.getUsersAnalytics(startDate, endDate)
        summaryData = [
          ['Tổng người dùng:', data.overview.totalUsers],
          ['Người lao động:', data.overview.totalWorkers],
          ['Doanh nghiệp:', data.overview.totalEnterprises],
          ['Trung tâm ĐT:', data.overview.totalTrainers]
        ]
      } else {
        const data = await adminAnalyticsService.getDashboardOverview(startDate, endDate)
        summaryData = [
          ['Tổng người dùng:', data.totalUsers],
          ['Khóa học hoạt động:', data.activeCourses],
          ['Việc làm đang tuyển:', data.activeJobs],
          ['Doanh thu trong kỳ:', new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.monthlyRevenue || 0)]
        ]
      }

      // Draw Summary Table manually
      const startX = 50
      let currentY = doc.y

      // Table Header Background
      doc.rect(startX, currentY, 495, 25).fill('#f1f5f9')
      doc.fillColor('#0f172a').font('Arial-Bold').text('Chỉ Số', startX + 10, currentY + 8)
      doc.text('Giá Trị', startX + 250, currentY + 8)
      currentY += 25

      // Table Rows
      doc.font('Arial').fillColor('#334155')
      summaryData.forEach((row, i) => {
        if (i % 2 === 0) {
          doc.rect(startX, currentY, 495, 25).fill('#f8fafc')
        }
        doc.fillColor('#334155').text(row[0], startX + 10, currentY + 8)
        doc.text(String(row[1]), startX + 250, currentY + 8)
        currentY += 25
      })

      doc.rect(startX, currentY, 495, 0).stroke() // Bottom border

      // --- Detailed Data Table ---
      doc.moveDown(3)
      currentY = doc.y

      const drawTableRow = (y, texts, xPositions, isHeader = false) => {
        if (isHeader) {
          doc.rect(startX, y, 495, 25).fill('#1e3a8a')
          doc.fillColor('#ffffff').font('Arial-Bold')
        } else {
          doc.rect(startX, y, 495, 25).fill('#ffffff')
          doc.fillColor('#334155').font('Arial')
        }
        
        texts.forEach((text, i) => {
          doc.text(text, xPositions[i], y + 8, { width: xPositions[i+1] ? xPositions[i+1] - xPositions[i] - 10 : 495 - (xPositions[i] - startX), lineBreak: false })
        })
        return y + 25
      }

      const checkPage = (y, height) => {
        if (y + height > 750) {
          doc.addPage()
          return 50
        }
        return y
      }

      if (tab === 'users') {
        const data = await adminAnalyticsService.getUsersAnalytics(startDate, endDate)
        doc.font('Arial-Bold').fillColor('#0f172a').fontSize(14).text('DANH SÁCH NGƯỜI DÙNG MỚI', startX, currentY)
        currentY += 25
        
        const xPos = [startX + 5, startX + 150, startX + 300, startX + 400]
        currentY = drawTableRow(currentY, ['Họ tên', 'Email', 'Vai trò', 'Ngày ĐK'], xPos, true)

        data.recentUsers.forEach((u, i) => {
          currentY = checkPage(currentY, 25)
          const dateStr = new Date(u.createdAt).toLocaleDateString('vi-VN')
          currentY = drawTableRow(currentY, [u.displayName, u.email, u.role, dateStr], xPos, false)
          doc.rect(startX, currentY, 495, 0).strokeColor('#e2e8f0').stroke()
        })
      } else if (tab === 'courses') {
        const data = await adminAnalyticsService.getTrainingAnalytics('ALL')
        doc.font('Arial-Bold').fillColor('#0f172a').fontSize(14).text('DANH SÁCH KHÓA HỌC', startX, currentY)
        currentY += 25
        
        const xPos = [startX + 5, startX + 200, startX + 350, startX + 420]
        currentY = drawTableRow(currentY, ['Tên khóa học', 'Nhà cung cấp', 'Số HV', 'Trạng thái'], xPos, true)

        const coursesTable = data.tables?.coursesTable || []
        coursesTable.forEach((c) => {
          currentY = checkPage(currentY, 25)
          currentY = drawTableRow(currentY, [c.title, c.providerName, String(c.enrollmentCount || 0), c.status], xPos, false)
          doc.rect(startX, currentY, 495, 0).strokeColor('#e2e8f0').stroke()
        })
      }

      currentY = checkPage(currentY, 50)
      doc.y = currentY + 20
      doc.fontSize(10).fillColor('#94a3b8').text(`Báo cáo được xuất tự động vào ${new Date().toLocaleString('vi-VN')}`, { align: 'center' })

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

export const adminAnalyticsExportService = {
  exportExcel,
  exportPdf
}
