const generateVerificationCode = () => {
  return Math.floor(10000 + Math.random() * 90000); 
};

const verifyCode = (providedCode, storedCode) => {
  return parseInt(providedCode, 10) === storedCode;
};

module.exports = {
  generateVerificationCode,
  verifyCode,
};
  