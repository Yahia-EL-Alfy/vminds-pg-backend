const validateSignUp = (req, res, next) => {
  const { firstName, lastName, username, email, password } = req.body;

  if (!firstName || !lastName || !username || !email || !password) {
    return res.status(400).send('All fields are required.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).send('Invalid email format.');
  }

  if (password.length < 8) {
    return res.status(400).send('Password must be at least 8 characters long.');
  }

  next();
};

const validateSignIn = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send('Email and password are required.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).send('Invalid email format.');
  }

  if (password.length < 8) {
    return res.status(400).send('Password must be at least 8 characters long.');
  }

  next();
};



module.exports = {
  validateSignUp,
  validateSignIn
}
