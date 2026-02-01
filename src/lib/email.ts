import nodemailer from 'nodemailer';

// For development, we'll use a mock/console logger
// In production, configure with real SMTP settings

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  console.log('📧 Attempting to send email to:', to);
  console.log('SMTP_USER configured:', !!process.env.SMTP_USER);
  console.log('SMTP_PASS configured:', !!process.env.SMTP_PASS);
  
  // If SMTP is not configured, log to console
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('='.repeat(60));
    console.log('📧 EMAIL (Development Mode - No SMTP configured)');
    console.log('='.repeat(60));
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('-'.repeat(60));
    console.log('HTML Content:');
    console.log(html);
    console.log('='.repeat(60));
    return true;
  }

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Shiv Furniture" <noreply@shivfurniture.com>',
      to,
      subject,
      html,
    });
    console.log('✅ Email sent successfully! Message ID:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return false;
  }
}

export function generateInviteEmail(name: string, inviteLink: string, type: 'CUSTOMER' | 'VENDOR' | 'BOTH' = 'CUSTOMER'): string {
  const isVendor = type === 'VENDOR';
  const portalType = isVendor ? 'Vendor Portal' : 'Customer Portal';
  const features = isVendor 
    ? `
              <li>View your purchase orders</li>
              <li>Track bill payments</li>
              <li>Download purchase order PDFs</li>
              <li>Manage your account</li>
            `
    : `
              <li>View your invoices and payment history</li>
              <li>Track order status</li>
              <li>Download invoice PDFs</li>
              <li>Make online payments</li>
            `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Shiv Furniture</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f7fa;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🏠 Shiv Furniture</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Budget Accounting System</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px;">Welcome, ${name}! 👋</h2>
            
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
              You have been invited to join the Shiv Furniture ${portalType}. This portal allows you to:
            </p>
            
            <ul style="color: #4b5563; line-height: 1.8; margin: 0 0 30px 0; padding-left: 20px;">
              ${features}
            </ul>
            
            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 30px 0;">
              Click the button below to set up your password and access your account:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Set Up Your Account
              </a>
            </div>
            
            <p style="color: #9ca3af; font-size: 13px; line-height: 1.6; margin: 30px 0 0 0;">
              This link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Shiv Furniture. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

interface PurchaseOrderLine {
  product?: { name: string } | null;
  description?: string | null;
  quantity: number | any;
  unitPrice: number | any;
  lineTotal: number | any;
}

interface PurchaseOrderEmailData {
  orderNumber: string;
  vendorName: string;
  vendorEmail?: string | null;
  orderDate: Date | string;
  expectedDate?: Date | string | null;
  lines: PurchaseOrderLine[];
  totalAmount: number | any;
  notes?: string | null;
}

export function generatePurchaseOrderEmail(data: PurchaseOrderEmailData): string {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number | any) => {
    const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  };

  const lineItemsHtml = data.lines.map((line, idx) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151;">${idx + 1}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151;">${line.product?.name || line.description || '-'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151;">${parseFloat(line.quantity) || 0}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151;">${formatCurrency(line.unitPrice)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151; font-weight: 500;">${formatCurrency(line.lineTotal)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Purchase Order ${data.orderNumber}</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
      <div style="max-width: 700px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📦 Purchase Order</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px; font-weight: 600;">${data.orderNumber}</p>
          </div>
          
          <!-- Order Info -->
          <div style="padding: 30px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">From</p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">Shiv Furniture</p>
              </div>
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">To</p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${data.vendorName}</p>
              </div>
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Order Date</p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${formatDate(data.orderDate)}</p>
              </div>
              ${data.expectedDate ? `
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Expected Delivery</p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${formatDate(data.expectedDate)}</p>
              </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Line Items -->
          <div style="padding: 0 30px 30px 30px;">
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <thead>
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">#</th>
                  <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Product</th>
                  <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Qty</th>
                  <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Unit Price</th>
                  <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${lineItemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4" style="padding: 15px 12px; text-align: right; font-weight: 700; font-size: 16px; color: #1f2937; border-top: 2px solid #1f2937;">Grand Total:</td>
                  <td style="padding: 15px 12px; text-align: right; font-weight: 700; font-size: 16px; color: #2563eb; border-top: 2px solid #1f2937;">${formatCurrency(data.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          ${data.notes ? `
          <div style="padding: 0 30px 30px 30px;">
            <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px;">
              <p style="margin: 0 0 5px 0; font-weight: 600; color: #92400e;">📝 Notes:</p>
              <p style="margin: 0; color: #78350f;">${data.notes}</p>
            </div>
          </div>
          ` : ''}
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #4b5563; margin: 0 0 10px 0;">Please confirm this order by replying to this email.</p>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">Thank you for your business!</p>
            <p style="color: #1f2937; margin: 15px 0 0 0; font-weight: 600;">Shiv Furniture</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate Sales Order Email Template
interface SalesOrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  orderDate: Date;
  expectedDate: Date | null;
  lines: any[];
  totalAmount: any;
  notes: string | null;
}

export function generateSalesOrderEmail(data: SalesOrderEmailData): string {
  const lineItemsHtml = data.lines.map((line, index) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px; color: #6b7280;">${index + 1}</td>
      <td style="padding: 12px; color: #1f2937; font-weight: 500;">${line.product?.name || line.description}</td>
      <td style="padding: 12px; text-align: right; color: #1f2937;">${line.quantity}</td>
      <td style="padding: 12px; text-align: right; color: #1f2937;">${formatCurrency(line.unitPrice)}</td>
      <td style="padding: 12px; text-align: right; color: #1f2937; font-weight: 600;">${formatCurrency(line.lineTotal)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sales Order ${data.orderNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🛒 Sales Order</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px; font-weight: 600;">${data.orderNumber}</p>
          </div>
          
          <!-- Order Info -->
          <div style="padding: 30px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">From</p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">Shiv Furniture</p>
              </div>
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">To</p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${data.customerName}</p>
              </div>
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Order Date</p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${formatDate(data.orderDate)}</p>
              </div>
              ${data.expectedDate ? `
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Expected Delivery</p>
                <p style="margin: 0; color: #1f2937; font-weight: 600;">${formatDate(data.expectedDate)}</p>
              </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Line Items -->
          <div style="padding: 0 30px 30px 30px;">
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <thead>
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">#</th>
                  <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Product</th>
                  <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Qty</th>
                  <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Unit Price</th>
                  <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${lineItemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4" style="padding: 15px 12px; text-align: right; font-weight: 700; font-size: 16px; color: #1f2937; border-top: 2px solid #1f2937;">Grand Total:</td>
                  <td style="padding: 15px 12px; text-align: right; font-weight: 700; font-size: 16px; color: #10b981; border-top: 2px solid #1f2937;">${formatCurrency(data.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          ${data.notes ? `
          <div style="padding: 0 30px 30px 30px;">
            <div style="background-color: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 15px;">
              <p style="margin: 0 0 5px 0; font-weight: 600; color: #1e40af;">📝 Notes:</p>
              <p style="margin: 0; color: #1e3a8a;">${data.notes}</p>
            </div>
          </div>
          ` : ''}
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #4b5563; margin: 0 0 10px 0;">Thank you for your order!</p>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">Please review the details above. An invoice will be sent once the order is confirmed.</p>
            <p style="color: #1f2937; margin: 15px 0 0 0; font-weight: 600;">Shiv Furniture</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
