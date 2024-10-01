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
const sendInvoiceEmail = async (invoiceData) => {
  const { total , vat , customerName, customerEmail, customerAddress, city, country, tran_ref, cart_amount, transaction_time, payment_method, payment_description, package_description } = invoiceData;

  const invoiceTemplatePath = path.join(__dirname, '../invoice.html');  // Ensure this path matches the uploaded file
  let emailHtml = fs.readFileSync(invoiceTemplatePath, 'utf8');

  const currentDate = new Date();
  const day = currentDate.getDate();          // Day of the month (1-31)
  const month = currentDate.getMonth() + 1;   // Months are zero-indexed (0-11), so add 1 to get (1-12)
  const year = currentDate.getFullYear();
  emailHtml = emailHtml.replace('Ahmed', customerName);
  emailHtml = emailHtml.replace('PTS2427338476735', tran_ref);
  emailHtml = emailHtml.replace('SAR 5.15', `${total} SAR`);
  emailHtml = emailHtml.replace('13:37 KSA', transaction_time);
  emailHtml = emailHtml.replace('VISA 6926', `${payment_method} ending in ${payment_description.slice(-4)}`);
  emailHtml = emailHtml.replace('Purchase', package_description);
  emailHtml = emailHtml.replace('bailed', `${customerAddress}, ${city}, ${country}`);
  emailHtml = emailHtml.replace('ttotal', cart_amount);
  emailHtml = emailHtml.replace('vvat', vat);
  emailHtml = emailHtml.replace('ddate', `${day}, ${month} , ${year}`);

  const mailOptions = {
    from: 'support@vminds.ai',
    to: customerEmail,
    subject: `Invoice for your purchase (Ref: ${tran_ref})`,
    html: emailHtml,  
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Invoice email sent');
  } catch (error) {
    console.error('Error sending invoice email:', error);
  }
};

module.exports = { sendVerificationEmail,sendInvoiceEmail };
