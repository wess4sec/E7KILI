const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ApiError } = require('../middleware/error-handler');
const { User } = require('../models/user');

function serializeUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function createAccessToken(userId, config) {
  return jwt.sign(
    { sub: userId.toString() },
    config.jwtSecret,
    {
      algorithm: 'HS256',
      expiresIn: config.jwtExpiresIn,
    },
  );
}

async function register(input, config) {
  const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds);
  let user;
  try {
    user = await User.create({
      email: input.email,
      passwordHash,
      name: input.name,
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.email) {
      throw new ApiError(409, 'EMAIL_ALREADY_REGISTERED', 'Email is already registered');
    }
    throw error;
  }

  return {
    user: serializeUser(user),
    token: createAccessToken(user._id, config),
  };
}

async function login(input, config) {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }

  return {
    user: serializeUser(user),
    token: createAccessToken(user._id, config),
  };
}

async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(401, 'INVALID_TOKEN', 'Authentication token is invalid');
  }
  return serializeUser(user);
}

module.exports = { createAccessToken, getCurrentUser, login, register };
