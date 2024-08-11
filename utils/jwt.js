const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  const payload = { userId };
  const secret = process.env.JWT_SECRET || 'secret_key'; 
  const options = { expiresIn: '1h' }; 

  return jwt.sign(payload, secret, options);
};

const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || 'secret_key';
  return jwt.verify(token, secret);
};

module.exports = {
      generateToken,
      verifyToken 
    };
