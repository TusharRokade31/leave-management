import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface User {
  name: string;
  email: string;
}

interface Leave {
  type: string;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  startTime?: string | null;
  endTime?: string | null;
  managerComment?: string | null;
}

// Updated interface to match your API calls and remove red lines
interface NotificationParams {
  mode: 'NEW' | 'EDIT' | 'APPROVED' | 'REJECTED' | 'COMMENT';
  leave: Leave;
  employeeName: string;
  employeeEmail: string;
  editSummary?: string;
}

export const sendLeaveNotification = async ({
  mode,
  leave,
  employeeName,
  employeeEmail,
  editSummary
}: NotificationParams) => {
  try {
    const notificationEmails = process.env.NOTIFICATION_EMAILS?.split(',') || [];
    
    const isWFH = leave.type === 'WORK_FROM_HOME';
    const requestLabel = isWFH ? 'Work From Home' : 'Leave';
    const themeColor = isWFH ? '#2563EB' : '#4F46E5'; 
    const bgColor = isWFH ? '#EFF6FF' : '#f5f5f5';

    let subject = '';
    let statusLabel = '';
    let statusBg = '#FEF3C7';
    let statusTextColor = '#92400E';

    // Logic for different modes
    switch (mode) {
      case 'NEW':
        subject = `[NEW] ${requestLabel} Request from ${employeeName}`;
        statusLabel = 'Pending Approval';
        break;
      case 'EDIT':
        subject = `[EDITED] ${requestLabel} Request from ${employeeName}`;
        statusLabel = 'Updated - Pending Approval';
        break;
      case 'APPROVED':
        subject = `${requestLabel} Approved - ${employeeName}`;
        statusLabel = 'Approved';
        statusBg = '#D1FAE5';
        statusTextColor = '#065F46';
        break;
      case 'REJECTED':
        subject = `${requestLabel} Rejected - ${employeeName}`;
        statusLabel = 'Rejected';
        statusBg = '#FEE2E2';
        statusTextColor = '#991B1B';
        break;
      case 'COMMENT':
        subject = `New Comment on ${requestLabel} - ${employeeName}`;
        statusLabel = 'Discussion Active';
        break;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: ${bgColor};">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: ${themeColor}; border-bottom: 2px solid ${themeColor}; padding-bottom: 10px;">${subject}</h2>
          
          ${editSummary ? `
            <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #B45309; font-size: 14px;"><strong>Update Summary:</strong> ${editSummary}</p>
            </div>
          ` : ''}

          <div style="margin: 20px 0; color: #374151; line-height: 1.6;">
            <p><strong>Employee:</strong> ${employeeName}</p>
            <p><strong>Type:</strong> ${leave.type}</p>
            <p><strong>Start Date:</strong> ${new Date(leave.startDate).toLocaleDateString()}</p>
            <p><strong>End Date:</strong> ${new Date(leave.endDate).toLocaleDateString()}</p>
            ${leave.startTime ? `<p><strong>Time:</strong> ${leave.startTime}${leave.endTime ? ` to ${leave.endTime}` : ''}</p>` : ''}
            <p><strong>Duration:</strong> ${leave.days} day(s)</p>
            <p><strong>Reason:</strong> ${leave.reason}</p>
          </div>
          
          ${leave.managerComment ? `
            <div style="background-color: #F8FAFC; padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid ${themeColor};">
              <p style="margin: 0 0 5px 0; color: ${themeColor}; font-weight: bold;">💬 Manager's Feedback:</p>
              <p style="margin: 0; color: #1E293B; font-style: italic;">${leave.managerComment}</p>
            </div>
          ` : ''}
          
          <div style="background-color: ${statusBg}; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <p style="margin: 0; color: ${statusTextColor}; font-weight: bold;">Current Status: ${statusLabel}</p>
          </div>

          <div style="margin-top: 25px; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="background-color: ${themeColor}; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View in Dashboard</a>
          </div>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: notificationEmails.join(','),
      cc: employeeEmail,
      subject: subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✉️ Email notification sent: ${mode} for ${employeeName}`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error; // Rethrow so the API can log it properly
  }
};