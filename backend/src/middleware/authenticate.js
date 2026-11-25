const jwt = require('jsonwebtoken');
const { ApiError } = require('./error-handler');

function authenticate(config) {
  return (req, res, next) => {
    const authorization = req.get('authorization') ?? '';
    const match = /^Bearer\s+(\S+)$/i.exec(authorization);
    if (!match) {
      next(
        new ApiError(
          401,
          'AUTHENTICATION_REQUIRED',
          'A bearer token is required',
        ),
      );
      return;
    }

    let payload;
    try {
      payload = jwt.verify(match[1], config.jwtSecret, {
        algorithms: ['HS256'],
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        next(new ApiError(401, 'TOKEN_EXPIRED', 'Authentication token has expired'));
        return;
      }
      if (error instanceof jwt.JsonWebTokenError) {
        next(new ApiError(401, 'INVALID_TOKEN', 'Authentication token is invalid'));
        return;
      }
      next(error);
      return;
    }

    if (
      typeof payload !== 'object' ||
      typeof payload.sub !== 'string' ||
      !/^[a-f\d]{24}$/i.test(payload.sub)
    ) {
      next(new ApiError(401, 'INVALID_TOKEN', 'Authentication token is invalid'));
      return;
    }

    req.auth = { userId: payload.sub };
    next();
  };
}

module.exports = { authenticate };
