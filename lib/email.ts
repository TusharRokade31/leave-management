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

export const sendLeaveNotification = async (
  leave: Leave,
  user: User,
  action: 'submitted' | 'approved' | 'rejected' = 'submitted'
) => {
  try {
    const notificationEmails = process.env.NOTIFICATION_EMAILS?.split(',') || [];
    
    // Determine if this is a WFH request for custom wording/styling
    const isWFH = leave.type === 'WORK_FROM_HOME';
    const requestLabel = isWFH ? 'Work From Home' : 'Leave';
    
    // Colors for WFH (Blue-ish) vs Leave (Indigo-ish)
    const themeColor = isWFH ? '#2563EB' : '#4F46E5'; 
    const bgColor = isWFH ? '#EFF6FF' : '#f5f5f5';

    let subject = '';
    let htmlContent = '';

    if (action === 'submitted') {
      subject = `New ${requestLabel} Request from ${user.name}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: ${bgColor};">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: ${themeColor}; border-bottom: 2px solid ${themeColor}; padding-bottom: 10px;">New ${requestLabel} Request</h2>
            
            <div style="margin: 20px 0;">
              <p><strong>Employee:</strong> ${user.name}</p>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Type:</strong> ${leave.type}</p>
              <p><strong>Start Date:</strong> ${new Date(leave.startDate).toLocaleDateString()}</p>
              <p><strong>End Date:</strong> ${new Date(leave.endDate).toLocaleDateString()}</p>
              ${leave.startTime ? `<p><strong>Time:</strong> ${leave.startTime}${leave.endTime ? ` to ${leave.endTime}` : ''}</p>` : ''}
              <p><strong>Duration:</strong> ${leave.days} day(s)</p>
              <p><strong>Reason:</strong> ${leave.reason}</p>
            </div>
            
            <div style="background-color: #FEF3C7; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <p style="margin: 0; color: #92400E;"><strong>⏰ Status:</strong> Pending Approval</p>
            </div>
          </div>
        </div>
      `;
    } else if (action === 'approved') {
      subject = `${requestLabel} Request Approved - ${user.name}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: ${bgColor};">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #10B981; border-bottom: 2px solid #10B981; padding-bottom: 10px;">✓ ${requestLabel} Request Approved</h2>
            
            <div style="margin: 20px 0;">
              <p><strong>Employee:</strong> ${user.name}</p>
              <p><strong>Type:</strong> ${leave.type}</p>
              <p><strong>Start Date:</strong> ${new Date(leave.startDate).toLocaleDateString()}</p>
              <p><strong>End Date:</strong> ${new Date(leave.endDate).toLocaleDateString()}</p>
              <p><strong>Duration:</strong> ${leave.days} day(s)</p>
            </div>
            
            ${leave.managerComment ? `
            <div style="background-color: #E0E7FF; padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid ${themeColor};">
              <p style="margin: 0 0 5px 0; color: ${themeColor}; font-weight: bold;">💬 Manager's Comment:</p>
              <p style="margin: 0; color: #1E293B;">${leave.managerComment}</p>
            </div>
            ` : ''}
            
            <div style="background-color: #D1FAE5; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <p style="margin: 0; color: #065F46;"><strong>✓ Status:</strong> Approved</p>
            </div>
          </div>
        </div>
      `;
    } else if (action === 'rejected') {
      subject = `${requestLabel} Request Rejected - ${user.name}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: ${bgColor};">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #EF4444; border-bottom: 2px solid #EF4444; padding-bottom: 10px;">✗ ${requestLabel} Request Rejected</h2>
            
            <div style="margin: 20px 0;">
              <p><strong>Employee:</strong> ${user.name}</p>
              <p><strong>Type:</strong> ${leave.type}</p>
              <p><strong>Start Date:</strong> ${new Date(leave.startDate).toLocaleDateString()}</p>
              <p><strong>End Date:</strong> ${new Date(leave.endDate).toLocaleDateString()}</p>
              <p><strong>Duration:</strong> ${leave.days} day(s)</p>
            </div>
            
            ${leave.managerComment ? `
            <div style="background-color: #FEF3C7; padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid #F59E0B;">
              <p style="margin: 0 0 5px 0; color: #F59E0B; font-weight: bold;">💬 Manager's Comment:</p>
              <p style="margin: 0; color: #1E293B;">${leave.managerComment}</p>
            </div>
            ` : ''}
            
            <div style="background-color: #FEE2E2; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <p style="margin: 0; color: #991B1B;"><strong>✗ Status:</strong> Rejected</p>
            </div>
          </div>
        </div>
      `;
    }

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: notificationEmails.join(','),
      cc: user.email,
      subject: subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✉️ Email notification sent successfully for ${action} ${requestLabel}`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
};