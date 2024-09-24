const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Create transporter object
const transporter = nodemailer.createTransport({
  host: 'mi3-ts7.a2hosting.com',
  port: 465,
  secure: true,
  auth: {
    user: 'support@vminds.ai',
    pass: 'a+V}S0d3ILd}^8v]#M',
  },
});

const sendVerificationEmail = async (to, verificationCode, firstName) => {
  const templatePath = path.join(__dirname, '../email_verfication.html');
  
  let emailHtml = fs.readFileSync(templatePath, 'utf8');

  emailHtml = emailHtml.replace('1 2 3 4 5', verificationCode);
  emailHtml = emailHtml.replace('Ahmed', firstName);


  const mailOptions = {
    from: 'support@vminds.ai',
    to,
    subject: 'Email Verification',
    html: emailHtml,  
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Verification email sent');
  } catch (error) {
    console.error('Error sending verification email:', error);
  }
};

module.exports = { sendVerificationEmail };
