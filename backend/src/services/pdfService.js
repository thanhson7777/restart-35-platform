import PDFDocument from 'pdfkit'

const generateCertificatePDF = (data) => {
  return new Promise((resolve, reject) => {
    try {
      const {
        userName = 'N/A',
        courseTitle = 'N/A',
        certificateNumber = 'N/A',
        verificationCode = 'N/A',
        issuedDate = new Date()
      } = data

      // Create landscape document (A4: 841.89 x 595.28 pt)
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 40, bottom: 40, left: 40, right: 40 }
      })

      const buffers = []
      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on('error', reject)

      // Register Vietnamese fonts from local Windows path
      doc.registerFont('Arial', 'C:/Windows/Fonts/Arial.ttf')
      doc.registerFont('Arial-Bold', 'C:/Windows/Fonts/Arialbd.ttf')

      // Draw background border
      doc.lineWidth(4)
      doc.strokeColor('#0f172a') // dark steel blue
      doc.rect(20, 20, 841.89 - 40, 595.28 - 40).stroke()

      doc.lineWidth(1)
      doc.strokeColor('#3b82f6') // cobalt accent border
      doc.rect(25, 25, 841.89 - 50, 595.28 - 50).stroke()

      // Header Brand
      doc.font('Arial-Bold').fontSize(16).fillColor('#3b82f6').text('RESTART 35+', { align: 'center' })
      doc.font('Arial').fontSize(10).fillColor('#64748b').text('Nền tảng hỗ trợ đào tạo & tái lập nghiệp', { align: 'center' })
      
      doc.moveDown(2)

      // Title
      doc.font('Arial-Bold').fontSize(36).fillColor('#0f172a').text('CHỨNG NHẬN HOÀN THÀNH', { align: 'center' })
      doc.font('Arial').fontSize(14).fillColor('#475569').text('CERTIFICATE OF COMPLETION', { align: 'center' })

      doc.moveDown(1.5)

      // Certify text
      doc.font('Arial').fontSize(13).fillColor('#334155').text('Chứng nhận này được trân trọng trao cho', { align: 'center' })
      
      doc.moveDown(1)

      // Student Name (large and highlighted)
      doc.font('Arial-Bold').fontSize(28).fillColor('#1e3a8a').text(userName.toUpperCase(), { align: 'center' })
      
      // Draw underline below name
      const nameWidth = doc.widthOfString(userName.toUpperCase())
      const xStart = (841.89 - nameWidth) / 2
      doc.moveTo(xStart - 10, doc.y + 4).lineTo(xStart + nameWidth + 10, doc.y + 4).lineWidth(1.5).strokeColor('#1e3a8a').stroke()

      doc.moveDown(1.5)

      // Course text
      doc.font('Arial').fontSize(13).fillColor('#334155').text('Đã hoàn thành xuất sắc khóa học chuyên đề', { align: 'center' })

      doc.moveDown(0.8)

      // Course Name
      doc.font('Arial-Bold').fontSize(20).fillColor('#0f172a').text(`"${courseTitle}"`, { align: 'center' })

      doc.moveDown(2.5)

      // Verification info (bottom left)
      const formattedDate = new Date(issuedDate).toLocaleDateString('vi-VN')
      
      doc.font('Arial-Bold').fontSize(9).fillColor('#475569')
      doc.text(`Mã số chứng chỉ: ${certificateNumber}`, 60, 470)
      doc.font('Arial')
      doc.text(`Mã xác thực: ${verificationCode}`, 60, 485)
      doc.text(`Ngày cấp: ${formattedDate}`, 60, 500)
      
      const verifyUrl = `https://restart35.vn/verify/${verificationCode}`
      doc.fillColor('#3b82f6')
      doc.text(`Tra cứu: ${verifyUrl}`, 60, 515)

      // Signatures (bottom right)
      doc.strokeColor('#cbd5e1').lineWidth(1)
      
      // Signature 1
      doc.moveTo(520, 495).lineTo(650, 495).stroke()
      doc.font('Arial-Bold').fontSize(10).fillColor('#0f172a').text('TRẦN VIỆT SƠN', 520, 505)
      doc.font('Arial').fontSize(9).fillColor('#64748b').text('Giám đốc Chương trình', 520, 520)

      // Signature 2
      doc.moveTo(680, 495).lineTo(810, 495).stroke()
      doc.font('Arial-Bold').fontSize(10).fillColor('#0f172a').text('BÙI THỊ ANH', 680, 505)
      doc.font('Arial').fontSize(9).fillColor('#64748b').text('Quản lý Học vụ', 680, 520)

      // Gold Seal Graphic (center bottom area)
      doc.fillColor('#fbbf24') // gold color
      doc.circle(410, 490, 24).fill()
      
      doc.fillColor('#d97706') // darker gold for inner circle border
      doc.circle(410, 490, 22).stroke()
      
      doc.font('Arial-Bold').fontSize(6).fillColor('#78350f')
      doc.text('SEAL', 395, 483, { width: 30, align: 'center' })
      doc.text('RESTART', 390, 491, { width: 40, align: 'center' })

      // Finalize document
      doc.end()

    } catch (err) {
      reject(err)
    }
  })
}

export const pdfService = { generateCertificatePDF }
