const validateSignUp = (req, res, next) => {
  const { firstName, lastName, username, email, password } = req.body;

  if (!firstName || !lastName || !username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  next();
};

const validateSignIn = (req, res, next) => {
  const { emailOrUsername, password } = req.body;

  if (!emailOrUsername || !password) {
    return res.status(400).json({ error: 'Username/Email and password are required.' });
  }

  // Regex for validating an email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Check if the input is either a valid email or a non-empty username
  if (!emailRegex.test(emailOrUsername) && emailOrUsername.length < 3) {
    return res.status(400).json({ error: 'Please provide a valid email or username (minimum 3 characters).' });
  }

  // Check password length
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  next();
};




module.exports = {
  validateSignUp,
  validateSignIn
}
