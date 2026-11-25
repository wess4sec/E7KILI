const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const {
  getCurrentUser,
  login,
  register,
} = require('../services/auth-service');
const {
  validateLoginBody,
  validateRegisterBody,
} = require('../validation');

function createAuthRouter(config) {
  const router = express.Router();
  const requireAuthentication = authenticate(config);

  router.post('/register', async (req, res) => {
    const result = await register(validateRegisterBody(req.body), config);
    res.status(201).json(result);
  });

  router.post('/login', async (req, res) => {
    const result = await login(validateLoginBody(req.body), config);
    res.status(200).json(result);
  });

  router.get('/me', requireAuthentication, async (req, res) => {
    const user = await getCurrentUser(req.auth.userId);
    res.status(200).json({ user });
  });

  return router;
}

module.exports = { createAuthRouter };
