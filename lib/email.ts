import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
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
}

export const sendLeaveNotification = async (
  leave: Leave,
  user: User,
  action: 'submitted' | 'approved' | 'rejected' = 'submitted'
) => {
  try {
    const notificationEmails = process.env.NOTIFICATION_EMAILS?.split(',') || [];

    let subject = '';
    let htmlContent = '';

    if (action === 'submitted') {
      subject = `New Leave Request from ${user.name}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #4F46E5; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">New Leave Request</h2>
            
            <div style="margin: 20px 0;">
              <p><strong>Employee:</strong> ${user.name}</p>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Leave Type:</strong> ${leave.type}</p>
              <p><strong>Start Date:</strong> ${new Date(leave.startDate).toLocaleDateString()}</p>
              <p><strong>End Date:</strong> ${new Date(leave.endDate).toLocaleDateString()}</p>
              ${leave.startTime ? `<p><strong>Time:</strong> ${leave.startTime}${leave.endTime ? ` to ${leave.endTime}` : ''}</p>` : ''}
              <p><strong>Duration:</strong> ${leave.days} day(s)</p>
              <p><strong>Reason:</strong> ${leave.reason}</p>
            </div>
            
            <div style="background-color: #FEF3C7; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <p style="margin: 0; color: #92400E;"><strong>⏰ Status:</strong> Pending Approval</p>
            </div>
            
            <p style="margin-top: 30px; color: #6B7280; font-size: 12px;">
              This is an automated notification from the Leave Management System.
            </p>
          </div>
        </div>
      `;
    } else if (action === 'approved') {
      subject = `Leave Request Approved - ${user.name}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #10B981; border-bottom: 2px solid #10B981; padding-bottom: 10px;">✓ Leave Request Approved</h2>
            
            <div style="margin: 20px 0;">
              <p><strong>Employee:</strong> ${user.name}</p>
              <p><strong>Leave Type:</strong> ${leave.type}</p>
              <p><strong>Start Date:</strong> ${new Date(leave.startDate).toLocaleDateString()}</p>
              <p><strong>End Date:</strong> ${new Date(leave.endDate).toLocaleDateString()}</p>
              ${leave.startTime ? `<p><strong>Time:</strong> ${leave.startTime}${leave.endTime ? ` to ${leave.endTime}` : ''}</p>` : ''}
              <p><strong>Duration:</strong> ${leave.days} day(s)</p>
            </div>
            
            <div style="background-color: #D1FAE5; padding: 15px; border-radius: 5px; margin-top: 20px;">
              <p style="margin: 0; color: #065F46;"><strong>✓ Status:</strong> Approved</p>
            </div>
          </div>
        </div>
      `;
    } else if (action === 'rejected') {
      subject = `Leave Request Rejected - ${user.name}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #EF4444; border-bottom: 2px solid #EF4444; padding-bottom: 10px;">✗ Leave Request Rejected</h2>
            
            <div style="margin: 20px 0;">
              <p><strong>Employee:</strong> ${user.name}</p>
              <p><strong>Leave Type:</strong> ${leave.type}</p>
              <p><strong>Start Date:</strong> ${new Date(leave.startDate).toLocaleDateString()}</p>
              <p><strong>End Date:</strong> ${new Date(leave.endDate).toLocaleDateString()}</p>
              ${leave.startTime ? `<p><strong>Time:</strong> ${leave.startTime}${leave.endTime ? ` to ${leave.endTime}` : ''}</p>` : ''}
              <p><strong>Duration:</strong> ${leave.days} day(s)</p>
            </div>
            
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
    console.log(`✉️ Email notification sent successfully for ${action} leave`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
};