const { verifyToken } = require("../utils/jwt");

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; 

  if (!token) {
    return res.status(401).json({ error: "Authentication token is required." });
  }

  try {
    const decoded = verifyToken(token);
    req.userId = decoded.userId; 
    next(); 
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};

module.exports = authenticate;
