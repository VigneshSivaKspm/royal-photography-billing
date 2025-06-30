// invoices.js - Professional Invoice Management System
class InvoiceManager {
    constructor() {
      this.invoicesList = document.getElementById('invoices-list');
      this.init();
    }
  
    async init() {
      try {
        await this.renderInvoices();
      } catch (error) {
        console.error('InvoiceManager initialization failed:', error);
        this.showError('Failed to initialize invoice system');
      }
    }
  
    // Format date in Indian locale
    formatDate(dateStr) {
      if (!dateStr) return 'N/A';
      try {
        const d = new Date(dateStr);
        return isNaN(d) ? dateStr : d.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: '2-digit'
        });
      } catch {
        return dateStr;
      }
    }
  
    // Format currency in Indian Rupees
    formatCurrency(amount) {
      const num = typeof amount === 'string' 
        ? parseFloat(amount.replace(/[^0-9.]/g, '')) || 0
        : Number(amount) || 0;
      return `₹${num.toLocaleString('en-IN')}`;
    }
  
    // Render all invoices
    async renderInvoices() {
      this.showLoading();
      
      try {
        const snapshot = await db.collection('bookings')
          .orderBy('createdAt', 'desc')
          .get();
  
        if (snapshot.empty) {
          this.showEmptyState();
          return;
        }
  
        const invoices = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
  
        this.renderInvoiceList(invoices);
        this.setupEventListeners(invoices);
      } catch (err) {
        console.error('Error loading invoices:', err);
        this.showError('Failed to load invoices. Please try again.');
      }
    }
  
    showLoading() {
      this.invoicesList.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading invoices...</p>
        </div>
      `;
    }
  
    showEmptyState() {
      this.invoicesList.innerHTML = `
        <div class="empty-state">
          <i class="icon">📄</i>
          <h3>No Invoices Found</h3>
          <p>There are no invoices to display at this time.</p>
        </div>
      `;
    }
  
    showError(message) {
      this.invoicesList.innerHTML = `
        <div class="error-state">
          <i class="icon">⚠️</i>
          <h3>Error Loading Invoices</h3>
          <p>${message}</p>
          <button class="retry-btn">Retry</button>
        </div>
      `;
      
      this.invoicesList.querySelector('.retry-btn')
        .addEventListener('click', () => this.renderInvoices());
    }
  
    renderInvoiceList(invoices) {
      this.invoicesList.innerHTML = `
        <div class="invoice-list-header">
          <h2>Invoices</h2>
          <span class="count-badge">${invoices.length} invoices</span>
        </div>
        <div class="invoice-list-container">
          ${invoices.map((invoice, idx) => this.renderInvoiceCard(invoice, idx)).join('')}
        </div>
      `;
    }
  
    renderInvoiceCard(invoice, idx) {
      return `
        <div class="invoice-card" data-id="${invoice.id}">
          <div class="invoice-info">
            <div class="invoice-meta">
              <span class="invoice-number">#${invoice.bookingNumber || 'N/A'}</span>
              <span class="invoice-date">${this.formatDate(invoice.eventDate)}</span>
            </div>
            <h3 class="customer-name">${invoice.contactName || 'Unnamed Customer'}</h3>
            <div class="invoice-amount">${this.formatCurrency(invoice.totalAmount)}</div>
          </div>
          <div class="invoice-actions">
            <button class="action-btn view-btn" data-idx="${idx}">
              <i class="icon">👁️</i> View
            </button>
            <button class="action-btn download-btn" data-idx="${idx}">
              <i class="icon">📥</i> PDF
            </button>
          </div>
        </div>
      `;
    }
  
    setupEventListeners(invoices) {
      document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = btn.dataset.idx;
          this.showInvoiceModal(invoices[idx]);
        });
      });
  
      document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const idx = btn.dataset.idx;
          await this.downloadInvoicePDF(invoices[idx], btn);
        });
      });
  
      document.querySelectorAll('.invoice-card').forEach(card => {
        card.addEventListener('click', () => {
          const idx = card.querySelector('.view-btn').dataset.idx;
          this.showInvoiceModal(invoices[idx]);
        });
      });
    }
  
    showInvoiceModal(invoice) {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = this.getModalHTML(invoice);
      document.body.appendChild(modal);
      
      modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
      modal.addEventListener('click', (e) => e.target === modal && modal.remove());
      
      modal.querySelector('.download-pdf-btn').addEventListener('click', async (e) => {
        await this.downloadInvoicePDF(invoice, e.target);
      });
    }
  
    getModalHTML(invoice) {
      return `
        <div class="modal-content">
          <button class="modal-close" aria-label="Close">&times;</button>
          
          <header class="modal-header">
            <h2>Invoice #${invoice.bookingNumber || 'N/A'}</h2>
            <div class="invoice-status">
              <span class="date">${this.formatDate(invoice.eventDate)}</span>
              <span class="amount">${this.formatCurrency(invoice.totalAmount)}</span>
            </div>
          </header>
          
          <div class="modal-body">
            ${this.renderModalSection('Customer Details', this.getCustomerDetailsHTML(invoice))}
            ${this.renderModalSection('Event Details', this.getEventDetailsHTML(invoice))}
            ${this.renderModalSection('Equipment', this.getEquipmentHTML(invoice))}
            ${this.renderModalSection('Payment', this.getPaymentHTML(invoice))}
            ${this.renderModalSection('Other Information', this.getOtherInfoHTML(invoice))}
          </div>
          
          <footer class="modal-footer">
            <button class="btn download-pdf-btn">
              <i class="icon">📥</i> Download PDF
            </button>
          </footer>
        </div>
      `;
    }
  
    renderModalSection(title, content) {
      return `
        <section class="modal-section">
          <h3 class="section-title">${title}</h3>
          <div class="section-content">${content}</div>
        </section>
      `;
    }
  
    getCustomerDetailsHTML(invoice) {
      return `
        <div class="detail-row">
          <span class="detail-label">Name:</span>
          <span class="detail-value">${invoice.contactName || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Contact:</span>
          <span class="detail-value">${invoice.phone || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Email:</span>
          <span class="detail-value">${invoice.email || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Address:</span>
          <span class="detail-value">
            ${[invoice.address, invoice.city, invoice.zip].filter(Boolean).join(', ') || 'N/A'}
          </span>
        </div>
      `;
    }
  

    getEventDetailsHTML(invoice) {
      return `
        <div class="detail-row">
          <span class="detail-label">Event Type:</span>
          <span class="detail-value">${invoice.eventType || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Event For:</span>
          <span class="detail-value">${invoice.eventFor || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Event Date:</span>
          <span class="detail-value">${this.formatDate(invoice.eventDate)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Start Time:</span>
          <span class="detail-value">${invoice.startTime || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Finish Time:</span>
          <span class="detail-value">${invoice.finishTime || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Venue:</span>
          <span class="detail-value">${invoice.functionRoom || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Organization:</span>
          <span class="detail-value">${invoice.organization || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Company Name:</span>
          <span class="detail-value">${invoice.companyName || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">System Name:</span>
          <span class="detail-value">${invoice.systemName || 'N/A'}</span>
        </div>
      `;
    }

    getEquipmentHTML(invoice) {
      return `
        <div class="detail-row">
          <span class="detail-label">Other Systems:</span>
          <span class="detail-value">${(invoice.otherSystems || []).join(', ') || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Details:</span>
          <span class="detail-value">${invoice.details || 'N/A'}</span>
        </div>
      `;
    }

    getPaymentHTML(invoice) {
      return `
        <div class="detail-row">
          <span class="detail-label">Advance Paid:</span>
          <span class="detail-value">${this.formatCurrency(invoice.advanceAmount)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Total Amount:</span>
          <span class="detail-value">${this.formatCurrency(invoice.totalAmount)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Payment Method:</span>
          <span class="detail-value">${invoice.paymentMethod || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">UPI Number:</span>
          <span class="detail-value">${invoice.upidNumber || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">UPI Date:</span>
          <span class="detail-value">${this.formatDate(invoice.upidDate)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">UPI Recipient:</span>
          <span class="detail-value">${invoice.upidRecipient || 'N/A'}</span>
        </div>
      `;
    }

    getOtherInfoHTML(invoice) {
      return `
        <div class="detail-row">
          <span class="detail-label">Referral Name:</span>
          <span class="detail-value">${invoice.referralName || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Reference:</span>
          <span class="detail-value">${invoice.reference || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Created At:</span>
          <span class="detail-value">${invoice.createdAt && invoice.createdAt.toDate ? this.formatDate(invoice.createdAt.toDate()) : 'N/A'}</span>
        </div>
      `;
    }
  
    async downloadInvoicePDF(invoice, btnEl = null) {
      if (!window.generatePremiumPDF) {
        console.error('PDF generator not available');
        return;
      }
  
      const btn = btnEl;
      const originalText = btn?.innerHTML;
      
      try {
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<span class="spinner"></span> Generating...';
        }
  
        const pdfBlob = await window.generatePremiumPDF(invoice);
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = `Invoice_${invoice.bookingNumber || ''}_${invoice.contactName || 'customer'}.pdf`;
        a.click();
        
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
          a.remove();
        }, 100);
      } catch (error) {
        console.error('PDF generation failed:', error);
        alert('Failed to generate PDF. Please try again.');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      }
    }
  }
  
  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    new InvoiceManager();
  });