const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { ApiError } = require('../middleware/error-handler');
const { logger: defaultLogger } = require('../logger');
const {
  createConversation,
  createMessage,
  deleteConversation,
  getConversationWithMessages,
  listConversations,
  listMessages,
  renameConversation,
  sendUserMessageAndGenerateReply,
} = require('../services/conversation-service');
const { GeminiService } = require('../services/gemini-service');
const {
  parsePagination,
  validateConversationCreateBody,
  validateConversationPatchBody,
  validateMessageBody,
  validateObjectId,
} = require('../validation');

function createConversationRouter(
  config,
  { geminiService, logger = defaultLogger } = {},
) {
  const router = express.Router();
  const requireAuthentication = authenticate(config);
  const activeGeminiService =
    geminiService ||
    new GeminiService({
      apiKey: config.geminiApiKey,
      model: config.geminiModel,
      fallbackModel: config.geminiFallbackModel,
      logger,
    });

  router.use(requireAuthentication);

  router.post('/', async (req, res) => {
    const body = validateConversationCreateBody(req.body ?? {});
    const conversation = await createConversation(req.auth.userId, body);
    res.status(201).json({ conversation });
  });

  router.get('/', async (req, res) => {
    const pagination = parsePagination(req.query);
    const result = await listConversations(req.auth.userId, pagination);
    res.status(200).json(result);
  });

  router.get('/:id', async (req, res) => {
    const id = validateObjectId(req.params.id);
    const result = await getConversationWithMessages(
      req.auth.userId,
      id,
      req.query,
    );
    res.status(200).json(result);
  });

  router.patch('/:id', async (req, res) => {
    const id = validateObjectId(req.params.id);
    const body = validateConversationPatchBody(req.body);
    const conversation = await renameConversation(req.auth.userId, id, body);
    res.status(200).json({ conversation });
  });

  router.delete('/:id', async (req, res) => {
    const id = validateObjectId(req.params.id);
    const result = await deleteConversation(req.auth.userId, id);
    res.status(200).json(result);
  });

  router.post('/:id/messages', async (req, res) => {
    const id = validateObjectId(req.params.id);
    const body = validateMessageBody(req.body);

    const shouldGenerateReply =
      activeGeminiService.isConfigured() &&
      body.role !== 'assistant' &&
      (body.generateReply === true ||
        (body.generateReply !== false));

    if (shouldGenerateReply) {
      const result = await sendUserMessageAndGenerateReply(
        req.auth.userId,
        id,
        { content: body.content },
        { geminiService: activeGeminiService },
      );
      res.status(201).json(result);
      return;
    }

    if (body.generateReply === true && !activeGeminiService.isConfigured()) {
      throw new ApiError(
        503,
        'SERVICE_UNAVAILABLE',
        'The AI service is temporarily unavailable. Please try again later.',
      );
    }

    const message = await createMessage(req.auth.userId, id, body);
    res.status(201).json({ message });
  });

  router.get('/:id/messages', async (req, res) => {
    const id = validateObjectId(req.params.id);
    const pagination = parsePagination(req.query);
    const result = await listMessages(req.auth.userId, id, pagination);
    res.status(200).json(result);
  });

  return router;
}

module.exports = { createConversationRouter };
