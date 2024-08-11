const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', 
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, 
  auth: {
    user: 'veemswsolution@gmail.com',
    pass: 'nuvw uhhg qtet bkvc',
  },
});

const sendVerificationEmail = async (to, verificationCode) => {
  const mailOptions = {
    from: 'veemswsolution@gmail.com',
    to,
    subject: 'Email Verification',
    html: `<p>Please use the following code to verify your email: <strong>${verificationCode}</strong></p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Verification email sent');
  } catch (error) {
    console.error('Error sending verification email:', error);
  }
};

module.exports = { sendVerificationEmail };
