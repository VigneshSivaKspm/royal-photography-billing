// app.js for Royal Photography Booking Generator
// Firebase config and initialization are handled in firebaseconfig.js
// Use global auth and db from firebaseconfig.js

// Track booking numbers
let lastBookingNumber = 0;

// Function to get and update booking number
async function getNextBookingNumber() {
  try {
    const docRef = db.collection('counters').doc('bookingCounter');
    const doc = await docRef.get();
    
    if (doc.exists) {
      lastBookingNumber = doc.data().lastNumber;
    }
    
    // Increment and update
    lastBookingNumber++;
    await docRef.set({ lastNumber: lastBookingNumber }, { merge: true });
    
    return lastBookingNumber;
  } catch (error) {
    console.error("Error getting booking number:", error);
    // Fallback to timestamp if Firestore fails
    return Date.now();
  }
}

// Wait for DOMContentLoaded to ensure form exists
document.addEventListener('DOMContentLoaded', function() {
  // Support both bookingForm and invoiceForm for backward compatibility
  const form = document.getElementById('bookingForm') || document.getElementById('invoiceForm');
  if (!form) return;

  const handleBookingSubmit = async (data, submitBtn) => {
    const originalBtnText = submitBtn.textContent;
    submitBtn.innerHTML = '<span class="spinner"></span> Generating Invoice...';
    submitBtn.disabled = true;
    try {
      // Get booking number
      const bookingNumber = await getNextBookingNumber();
      data.bookingNumber = bookingNumber;

      // Generate premium PDF
      const pdfBlob = await generatePremiumPDF(data);

      // Store in Firestore
      await db.collection('bookings').add({
        ...data,
        createdAt: new Date()
      });

      // Display result
      const pdfUrl = URL.createObjectURL(pdfBlob);
      document.getElementById('result').innerHTML = `
        <div class="pdf-success">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#27ae60">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <h3>Invoice Generated Successfully!</h3>
          <div class="pdf-actions">
            <a href="${pdfUrl}" download="Royal_Photography_Invoice_${data.contactName || ''}_${data.eventDate || ''}.pdf" class="main-btn">
              Download PDF
            </a>
            <button onclick="printPDF('${pdfUrl}')" class="main-btn secondary">
              Print Invoice
            </button>
          </div>
          <iframe src="${pdfUrl}" width="100%" height="700px" class="pdf-preview"></iframe>
        </div>
      `;
    } catch (error) {
      console.error("Error generating invoice:", error);
      document.getElementById('result').innerHTML = `
        <div class="pdf-error">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#e74c3c">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <h3>Error Generating Invoice</h3>
          <p>${error.message}</p>
          <button onclick="location.reload()" class="main-btn">Try Again</button>
        </div>
      `;
    } finally {
      submitBtn.textContent = originalBtnText;
      submitBtn.disabled = false;
    }
  };

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const data = {};

    formData.forEach((value, key) => {
      if (data[key]) {
        if (!Array.isArray(data[key])) data[key] = [data[key]];
        data[key].push(value);
      } else {
        data[key] = value;
      }
    });

    // Process checkboxes
    data.otherSystems = Array.from(form.querySelectorAll('input[name="otherSystems"]:checked')).map(cb => cb.value);

    // Collect details for each selected other system
    data.otherSystemsDetails = [];
    if (data.otherSystems && data.otherSystems.length > 0) {
      data.otherSystems.forEach(sys => {
        const sysId = sys.replace(/[^a-zA-Z0-9]/g, '_');
        const count = form.querySelector(`[name='otherSystemCount_${sysId}']`)?.value || '';
        const desc = form.querySelector(`[name='otherSystemDesc_${sysId}']`)?.value || '';
        data.otherSystemsDetails.push({ system: sys, count, desc });
      });
    }

    // Clean up payment data
    if (data.paymentMethod === 'Cash') {
      delete data.upidNumber;
      delete data.upidDate;
      delete data.upidRecipient;
    }

    await handleBookingSubmit(data, submitBtn);
  });
});

// Print PDF function
window.printPDF = function(pdfUrl) {
  const printWindow = window.open(pdfUrl);
  printWindow.onload = function() {
    printWindow.print();
  };
};

// Premium PDF Generation
async function generatePremiumPDF(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
    filters: ['ASCIIHexEncode']
  });

 
  // Load all images (no watermark)
  const [logo, instaQR, gpayQR, sign] = await Promise.all([
    toDataUrl('logo.png'),
    toDataUrl('instagram.jpg'),
    toDataUrl('GooglePay_QR.png'),
    toDataUrl('sign.png')
  ]);

  // Premium color palette
  const colors = {
    gold: '#EFBF04',
    darkGreen: '#0B3D2E', // deep royal green
    cream: '#F8F6F0',
    accentGold: '#FFD700',
    textDark: '#232323',
    textLight: '#6B6B6B',
    white: '#fff'
  };

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - (margin * 2);

  // ...existing code...

  // ==================== PAGE CORNER BORDERS ====================
  // Minimal dark green corners, wider and closer to page edge, thinner
  const cornerLen = 40; // wider (about 14mm)
  const cornerThick = 1.2; // sleeker
  const edgePad = 8; // closer to the edge
  doc.setDrawColor(colors.darkGreen);
  doc.setLineWidth(cornerThick);
  // Top-left
  doc.line(edgePad, edgePad, edgePad + cornerLen, edgePad); // horizontal
  doc.line(edgePad, edgePad, edgePad, edgePad + cornerLen); // vertical
  // Top-right
  doc.line(pageWidth - edgePad, edgePad, pageWidth - edgePad - cornerLen, edgePad);
  doc.line(pageWidth - edgePad, edgePad, pageWidth - edgePad, edgePad + cornerLen);
  // Bottom-left
  doc.line(edgePad, pageHeight - edgePad, edgePad + cornerLen, pageHeight - edgePad);
  doc.line(edgePad, pageHeight - edgePad, edgePad, pageHeight - edgePad - cornerLen);
  // Bottom-right
  doc.line(pageWidth - edgePad, pageHeight - edgePad, pageWidth - edgePad - cornerLen, pageHeight - edgePad);
  doc.line(pageWidth - edgePad, pageHeight - edgePad, pageWidth - edgePad, pageHeight - edgePad - cornerLen);

  // ==================== HEADER SECTION ====================
  doc.setFillColor(colors.darkGreen);
  doc.roundedRect(margin, margin, contentWidth, 70, 16, 16, 'F');

  // Logo in gold circle
  doc.setFillColor(colors.gold);
  doc.circle(margin + 35, margin + 35, 28, 'F');
  doc.addImage(logo, 'PNG', margin + 10, margin + 10, 50, 50);

  // Header text (modern, stylish)
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(colors.white);
  doc.text('ROYAL PHOTOGRAPHY', margin + 75, margin + 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.text('BOOKING CONFIRMATION', margin + 75, margin + 58);
  
  // Booking details (right, in white for contrast, with extra right margin)
  doc.setFontSize(10);
  doc.setTextColor(colors.white);
  const rightX = pageWidth - margin - 25;
  doc.text(`Booking Date : ${new Date().toLocaleDateString()}`, rightX, margin + 25, { align: 'right' });
  doc.text(`Event Date : ${formatDate(data.eventDate)}`, rightX, margin + 40, { align: 'right' });
  doc.text(`Booking No : ${data.bookingNumber || ''}`, rightX, margin + 55, { align: 'right' });

  // ==================== CLIENT & EVENT SECTION ====================
  let yPos = margin + 90;
  
  // Section header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(colors.darkGreen);
  doc.text('CUSTOMER & EVENT DETAILS', margin + 12, yPos + 15);
  yPos += 42;

  // Two column layout (align with referral/payment details)
  const col1 = margin + 12;
  const col2 = margin + contentWidth / 2 + 12;
  
  // Client details (left)
  doc.setFontSize(10);
  doc.setTextColor(colors.textDark);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer', col1, yPos);
  doc.setFont('helvetica', 'normal');
  let clientY = yPos + 15;
  doc.text('Name', col1, clientY);
  doc.text(`: ${data.contactName || ''}`, col1 + 78, clientY);
  clientY += 13;
  doc.text('Phone', col1, clientY);
  doc.text(`: ${data.phone || ''}`, col1 + 78, clientY);
  clientY += 13;
  doc.text('Email', col1, clientY);
  doc.text(`: ${data.email || ''}`, col1 + 78, clientY);
  clientY += 13;
  doc.text('Address', col1, clientY);
  // Improved address wrapping: 25-35, break at space or comma
  let addressText = data.address || '';
  if (addressText.length > 30) {
    let breakIdx = -1;
    for (let i = 25; i <= 35 && i < addressText.length; i++) {
      if (addressText[i] === ' ' || addressText[i] === ',') {
        breakIdx = i;
        break;
      }
    }
    if (breakIdx === -1) breakIdx = 30; // fallback
    const addrLines = [addressText.slice(0, breakIdx), addressText.slice(breakIdx).trim()];
    doc.text(`: ${addrLines[0]}`, col1 + 78, clientY);
    clientY += 13;
    doc.text(`  ${addrLines[1]}`, col1 + 78, clientY); // indent second line
  } else {
    doc.text(`: ${addressText}`, col1 + 78, clientY);
  }
  clientY += 13;
  doc.text('City', col1, clientY);
  doc.text(`: ${data.city || ''}`, col1 + 78, clientY);
  clientY += 13;
  doc.text('Zip Code', col1, clientY);
  doc.text(`: ${data.zip || ''}`, col1 + 78, clientY);

  // Calculate max y for event section
  let eventStartY = yPos;
  let eventY = yPos + 15;
  
  // Event details (right, one per line, with formatted date/time, aligned like left side)
  doc.setFont('helvetica', 'bold');
  doc.text('Event', col2, eventStartY);
  doc.setFont('helvetica', 'normal');
  let eventLineY = eventStartY + 15;
  doc.text('Type', col2, eventLineY);
  doc.text(`: ${data.eventType || ''}`, col2 + 78, eventLineY);
  eventLineY += 13;
  doc.text('For', col2, eventLineY);
  doc.text(`: ${data.eventFor || ''}`, col2 + 78, eventLineY);
  eventLineY += 13;
  doc.text('Date', col2, eventLineY);
  doc.text(`: ${formatDate(data.eventDate)}`, col2 + 78, eventLineY);
  eventLineY += 13;
  doc.text('Starting', col2, eventLineY);
  doc.text(`: ${formatDateTime(data.startTime)}`, col2 + 78, eventLineY);
  eventLineY += 13;
  doc.text('Ending', col2, eventLineY);
  doc.text(`: ${formatDateTime(data.finishTime)}`, col2 + 78, eventLineY);
  eventLineY += 13;
  doc.text('Venue', col2, eventLineY);
  doc.text(`: ${data.functionRoom || ''}`, col2 + 78, eventLineY);
  eventLineY += 13;
  doc.text('Organization', col2, eventLineY);
  doc.text(`: ${data.organization || ''}`, col2 + 78, eventLineY);

  // Set yPos to the max of clientY or eventLineY for next section
  yPos = Math.max(clientY, eventLineY) + 10;

 


  // ==================== SERVICES SECTION ====================
  if (data.otherSystemsDetails && data.otherSystemsDetails.length > 0) {
   doc.setFontSize(12);
    doc.setTextColor(colors.darkGreen);
    doc.setFont('helvetica', 'bold');
    doc.text('EQUIPMENTS', margin + 12, yPos + 15);
    yPos += 42;

    doc.setFontSize(10);
    doc.setTextColor(colors.textDark);
    doc.setFont('helvetica', 'normal');
    data.otherSystemsDetails.forEach(item => {
      let line = `• ${item.system}`;
      if (item.count) line += ` (Count: ${item.count})`;
      if (item.desc) line += ` - ${item.desc}`;
      doc.text(line, margin + 28, yPos);
      yPos += 15;
    });
    yPos += 5;
  }

  // Special details
  if (data.details) {
    doc.setFont('helvetica', 'bold');
    doc.text('Special Instructions:', margin + 12, yPos);
    doc.setFont('helvetica', 'normal');
    const detailsLines = doc.splitTextToSize(data.details, contentWidth - 40);
    doc.text(detailsLines, margin + 28, yPos + 15);
    yPos += 15 + (detailsLines.length * 12);
  }

  // ==================== REFERRAL SECTION ====================
  if (data.referralName || data.reference) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(colors.darkGreen);
    doc.text('REFERRAL DETAILS', margin + 12, yPos + 15);
    yPos += 42;

    doc.setFontSize(10);
    doc.setTextColor(colors.textDark);
    doc.setFont('helvetica', 'normal');
    let refY = yPos;
    if (data.referralName) {
      doc.text('Referred By', margin + 12, refY);
      doc.text(`: ${data.referralName}`, margin + 90, refY);
      refY += 13;
    }
    if (data.reference) {
      doc.text('Reference Note', margin + 12, refY);
      // For multiline note, align all lines after the colon
      const referenceLines = doc.splitTextToSize(data.reference, contentWidth - 100);
      doc.text(':', margin + 90, refY);
      referenceLines.forEach((line, idx) => {
        doc.text(line, margin + 95, refY + (idx * 13));
      });
      refY += referenceLines.length * 13;
    }
    yPos = refY + 10;
  }

  // ==================== PAYMENT SECTION ====================

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(colors.darkGreen);
  doc.text('PAYMENT DETAILS', margin + 12, yPos + 15);
  yPos += 42;

  // Payment info, one per line, with aligned colon
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.textDark);
  let payY = yPos;
  function cleanAmount(val) {
    if (!val) return 0;
    return parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
  }
  let total = cleanAmount(data.totalAmount);
  let advance = cleanAmount(data.advanceAmount);
  let balance = total - advance;
  doc.text('Total Amount', margin + 12, payY);
  doc.text(`: ${formatCurrency(data.totalAmount)}`, margin + 100, payY);
  payY += 13;
  doc.text('Advance Paid', margin + 12, payY);
  doc.text(`: ${formatCurrency(data.advanceAmount)}`, margin + 100, payY);
  payY += 13;
  doc.text('Payment Method', margin + 12, payY);
  doc.text(`: ${data.paymentMethod || ''}`, margin + 100, payY);
  payY += 13;
  if (data.paymentMethod === 'Upid/Gpay') {
    if (data.upidNumber) {
      doc.text('UPI Number', margin + 12, payY);
      doc.text(`: ${data.upidNumber}`, margin + 100, payY);
      payY += 13;
    }
    if (data.upidDate) {
      doc.text('Date', margin + 12, payY);
      doc.text(`: ${formatDate(data.upidDate)}`, margin + 100, payY);
      payY += 13;
    }
    if (data.upidRecipient) {
      doc.text('Recipient', margin + 12, payY);
      doc.text(`: ${data.upidRecipient}`, margin + 100, payY);
      payY += 13;
    }
  }
  doc.text('Balance Due', margin + 12, payY);
  doc.text(`: ${formatCurrency(balance)}`, margin + 100, payY);
  yPos = payY + 20;

// --- Date formatting helpers ---
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });
}
function formatDateTime(dtStr) {
  if (!dtStr) return '';
  const d = new Date(dtStr);
  if (isNaN(d)) return dtStr;
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

  // ==================== SIGNATURE SECTION ====================
  doc.setDrawColor(colors.gold);
  doc.setLineWidth(1);
  doc.line(pageWidth - margin - 150, yPos, pageWidth - margin, yPos);
  doc.setFontSize(10);
  doc.setTextColor(colors.textDark);
  doc.text('Customer Signature', pageWidth - margin - 75, yPos + 20, { align: 'center' });
  // Only customer signature here
  yPos = yPos + 70; // Add space after customer signature section

  // ==================== FOOTER SIGNATURE (Managing Director) ====================
  // Move signature a bit higher and more to the right for better alignment
  const directorSignY = pageHeight - margin - 130; // move up by 30px
  const directorSignX = pageWidth - margin - 100; // move right by 40px
  doc.addImage(sign, 'JPEG', directorSignX, directorSignY, 80, 40);
  const directorLabelX = directorSignX + 40; // center label under signature image
  const directorLabelY = directorSignY + 40 + 10;
  doc.setFontSize(10);
  doc.setTextColor(colors.textDark);
  doc.text('Managing Director', directorLabelX, directorLabelY, { align: 'center' });
  doc.text('Royal Group', directorLabelX, directorLabelY + 14, { align: 'center' });

  // ==================== FOOTER ====================
  yPos = pageHeight - margin - 40;
  doc.setFillColor(colors.darkGreen);
  doc.roundedRect(margin, yPos, contentWidth, 40, 10, 10, 'F');
  doc.setFontSize(11);
  doc.setTextColor(colors.white);
  doc.setFont('times', 'bold');
  doc.text('ROYAL PHOTOGRAPHY', margin + 12, yPos + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Phone: +91 85939 25936 | Email: bookings@royalphotography.org', margin + 12, yPos + 33);
  // QR codes with extra right margin
  const qrSize = 30;
  const qrGap = 10;
  const extraRightMargin = 20;
  doc.addImage(instaQR, 'JPEG', pageWidth - margin - qrSize * 2 - qrGap - extraRightMargin, yPos + 5, qrSize, qrSize);
  doc.addImage(gpayQR, 'PNG', pageWidth - margin - qrSize - extraRightMargin, yPos + 5, qrSize, qrSize);

  return doc.output('blob');
}

function formatCurrency(amount) {
  let num = 0;
  if (typeof amount === 'string') {
    num = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
  } else {
    num = Number(amount) || 0;
  }
  return 'Rs. ' + num.toLocaleString('en-IN');
}

// Helper: convert image to base64
function toDataUrl(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function() {
      const reader = new FileReader();
      reader.onloadend = function() {
        resolve(reader.result);
      }
      reader.readAsDataURL(xhr.response);
    };
    xhr.onerror = reject;
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.send();
  });
}