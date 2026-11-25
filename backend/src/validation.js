const { ApiError } = require('./middleware/error-handler');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const objectIdPattern = /^[a-f\d]{24}$/i;

function requireObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'INVALID_INPUT', 'Request body must be an object');
  }
  return value;
}

function allowOnlyKeys(value, allowedKeys) {
  const unexpectedKey = Object.keys(value).find(
    (key) => !allowedKeys.includes(key),
  );
  if (unexpectedKey) {
    throw new ApiError(400, 'INVALID_INPUT', 'Request contains an unknown field');
  }
}

function validateEmail(value) {
  if (typeof value !== 'string') {
    throw new ApiError(400, 'INVALID_EMAIL', 'A valid email is required');
  }

  const email = value.trim().toLowerCase();
  if (email.length > 254 || !emailPattern.test(email)) {
    throw new ApiError(400, 'INVALID_EMAIL', 'A valid email is required');
  }
  return email;
}

function validateRegisterBody(body) {
  const input = requireObject(body);
  allowOnlyKeys(input, ['email', 'password', 'name']);
  const email = validateEmail(input.email);

  if (
    typeof input.password !== 'string' ||
    input.password.length < 8 ||
    Buffer.byteLength(input.password, 'utf8') > 72
  ) {
    throw new ApiError(
      400,
      'INVALID_PASSWORD',
      'Password must be at least 8 characters and at most 72 UTF-8 bytes',
    );
  }

  let name = '';
  if (input.name !== undefined) {
    if (typeof input.name !== 'string') {
      throw new ApiError(400, 'INVALID_NAME', 'Name must be a string');
    }
    name = input.name.trim();
    if (name.length === 0 || name.length > 80) {
      throw new ApiError(400, 'INVALID_NAME', 'Name must be 1 to 80 characters');
    }
  }

  return { email, password: input.password, name };
}

function validateLoginBody(body) {
  const input = requireObject(body);
  allowOnlyKeys(input, ['email', 'password']);
  if (typeof input.password !== 'string' || input.password.length === 0) {
    throw new ApiError(400, 'INVALID_PASSWORD', 'Password is required');
  }
  if (Buffer.byteLength(input.password, 'utf8') > 72) {
    throw new ApiError(400, 'INVALID_PASSWORD', 'Password is too long');
  }
  return {
    email: validateEmail(input.email),
    password: input.password,
  };
}

function validateConversationCreateBody(body) {
  const input = requireObject(body);
  allowOnlyKeys(input, ['title']);
  if (input.title === undefined) {
    return {};
  }
  return { title: validateTitle(input.title) };
}

function validateConversationPatchBody(body) {
  const input = requireObject(body);
  allowOnlyKeys(input, ['title']);
  if (input.title === undefined) {
    throw new ApiError(400, 'INVALID_INPUT', 'At least one field is required');
  }
  return { title: validateTitle(input.title) };
}

function validateTitle(value) {
  if (typeof value !== 'string') {
    throw new ApiError(400, 'INVALID_TITLE', 'Title must be a string');
  }
  const title = value.trim();
  if (title.length === 0 || title.length > 120) {
    throw new ApiError(400, 'INVALID_TITLE', 'Title must be 1 to 120 characters');
  }
  return title;
}

function validateMessageBody(body) {
  const input = requireObject(body);
  allowOnlyKeys(input, ['content', 'role', 'generateReply']);
  if (typeof input.content !== 'string') {
    throw new ApiError(400, 'INVALID_MESSAGE', 'Message content must be a string');
  }
  const content = input.content.trim();
  if (content.length === 0 || content.length > 10000) {
    throw new ApiError(
      400,
      'INVALID_MESSAGE',
      'Message content must be 1 to 10000 characters',
    );
  }

  let role = 'user';
  if (input.role !== undefined) {
    if (typeof input.role !== 'string' || !['user', 'assistant'].includes(input.role)) {
      throw new ApiError(400, 'INVALID_ROLE', 'Role must be user or assistant');
    }
    role = input.role;
  }

  let generateReply;
  if (input.generateReply !== undefined) {
    if (typeof input.generateReply !== 'boolean') {
      throw new ApiError(400, 'INVALID_INPUT', 'generateReply must be a boolean');
    }
    generateReply = input.generateReply;
  }

  return { content, role, generateReply };
}

function validateObjectId(value) {
  if (typeof value !== 'string' || !objectIdPattern.test(value)) {
    throw new ApiError(400, 'INVALID_ID', 'A valid resource ID is required');
  }
  return value;
}

function parsePagination(query) {
  allowOnlyKeys(query, ['page', 'limit']);
  const page = parsePositiveInteger(query.page, 1, 1000000, 'page');
  const limit = parsePositiveInteger(query.limit, 20, 100, 'limit');
  return { page, limit, skip: (page - 1) * limit };
}

function parsePositiveInteger(value, defaultValue, maximum, fieldName) {
  if (value === undefined) {
    return defaultValue;
  }
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new ApiError(400, 'INVALID_PAGINATION', `${fieldName} must be a positive integer`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    throw new ApiError(
      400,
      'INVALID_PAGINATION',
      `${fieldName} must not exceed ${maximum}`,
    );
  }
  return parsed;
}

module.exports = {
  parsePagination,
  validateConversationCreateBody,
  validateConversationPatchBody,
  validateLoginBody,
  validateMessageBody,
  validateObjectId,
  validateRegisterBody,
};
