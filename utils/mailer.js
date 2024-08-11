// const nodemailer = require('nodemailer');

// const transporter = nodemailer.createTransport({
//   service: 'gmail', 
//   host: 'smtp.gmail.com',
//   port: 587,
//   secure: false, 
//   auth: {
//     user: 'veemswsolution@gmail.com',
//     pass: 'nuvw uhhg qtet bkvc',
//   },
// });

// const sendVerificationEmail = async (to, verificationCode) => {
//   const mailOptions = {
//     from: 'veemswsolution@gmail.com',
//     to,
//     subject: 'Email Verification',
//     html: `<p>Please use the following code to verify your email: <strong>${verificationCode}</strong></p>`,
//   };

//   try {
//     await transporter.sendMail(mailOptions);
//     console.log('Verification email sent');
//   } catch (error) {
//     console.error('Error sending verification email:', error);
//   }
// };

// module.exports = { sendVerificationEmail };

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
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
    await new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending verification email:', error);
          reject(error);
        } else {
          console.log('Verification email sent:', info.response);
          resolve(info);
        }
      });
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
  }
};

module.exports = { sendVerificationEmail };
