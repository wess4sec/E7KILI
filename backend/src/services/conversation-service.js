const { ApiError } = require('../middleware/error-handler');
const { Conversation } = require('../models/conversation');
const { Message } = require('../models/message');
const { parsePagination } = require('../validation');

function serializeConversation(conversation) {
  return {
    id: conversation._id.toString(),
    title: conversation.title,
    ownerId: conversation.owner.toString(),
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

function serializeMessage(message) {
  return {
    id: message._id.toString(),
    conversationId: message.conversation.toString(),
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

async function findConversationAndVerifyOwner(conversationId, ownerId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(404, 'NOT_FOUND', 'Conversation not found');
  }
  if (conversation.owner.toString() !== ownerId.toString()) {
    throw new ApiError(403, 'FORBIDDEN', 'Access denied to this conversation');
  }
  return conversation;
}

async function createConversation(ownerId, input = {}) {
  const title = input.title || 'New conversation';
  const conversation = await Conversation.create({
    owner: ownerId,
    title,
  });
  return serializeConversation(conversation);
}

async function listConversations(ownerId, { page = 1, limit = 20, skip = 0 } = {}) {
  const [conversations, total] = await Promise.all([
    Conversation.find({ owner: ownerId })
      .sort({ updatedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit),
    Conversation.countDocuments({ owner: ownerId }),
  ]);

  return {
    conversations: conversations.map(serializeConversation),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getConversationWithMessages(ownerId, conversationId, query = {}) {
  const conversation = await findConversationAndVerifyOwner(conversationId, ownerId);
  const { page, limit, skip } = parsePagination(query);

  const [messages, total] = await Promise.all([
    Message.find({ conversation: conversation._id })
      .sort({ createdAt: 1, _id: 1 })
      .skip(skip)
      .limit(limit),
    Message.countDocuments({ conversation: conversation._id }),
  ]);

  return {
    conversation: serializeConversation(conversation),
    messages: messages.map(serializeMessage),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function renameConversation(ownerId, conversationId, { title }) {
  const conversation = await findConversationAndVerifyOwner(conversationId, ownerId);
  conversation.title = title;
  await conversation.save();
  return serializeConversation(conversation);
}

async function deleteConversation(ownerId, conversationId) {
  const conversation = await findConversationAndVerifyOwner(conversationId, ownerId);
  await Promise.all([
    Conversation.deleteOne({ _id: conversation._id }),
    Message.deleteMany({ conversation: conversation._id }),
  ]);
  return { success: true };
}

async function createMessage(ownerId, conversationId, { content, role = 'user' }) {
  const conversation = await findConversationAndVerifyOwner(conversationId, ownerId);
  const message = await Message.create({
    conversation: conversation._id,
    role,
    content,
  });

  conversation.lastMessageAt = message.createdAt;
  await conversation.save();

  return serializeMessage(message);
}

async function sendUserMessageAndGenerateReply(
  ownerId,
  conversationId,
  { content },
  { geminiService },
) {
  const conversation = await findConversationAndVerifyOwner(conversationId, ownerId);

  // Retrieve relevant conversation history with context limit
  const recentMessagesDesc = await Message.find({ conversation: conversation._id })
    .sort({ createdAt: -1, _id: -1 })
    .limit(10);
  const history = recentMessagesDesc.reverse();

  // Generate response with Gemini
  const replyText = await geminiService.generateReply({
    history,
    userMessage: content,
  });

  // Only persist both messages once Gemini generation succeeds
  const userMessage = await Message.create({
    conversation: conversation._id,
    role: 'user',
    content,
  });

  const assistantMessage = await Message.create({
    conversation: conversation._id,
    role: 'assistant',
    content: replyText,
  });

  conversation.lastMessageAt = assistantMessage.createdAt;
  await conversation.save();

  return {
    message: serializeMessage(assistantMessage),
    userMessage: serializeMessage(userMessage),
  };
}

async function listMessages(ownerId, conversationId, { page = 1, limit = 20, skip = 0 } = {}) {
  await findConversationAndVerifyOwner(conversationId, ownerId);

  const [messages, total] = await Promise.all([
    Message.find({ conversation: conversationId })
      .sort({ createdAt: 1, _id: 1 })
      .skip(skip)
      .limit(limit),
    Message.countDocuments({ conversation: conversationId }),
  ]);

  return {
    messages: messages.map(serializeMessage),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

module.exports = {
  createConversation,
  createMessage,
  deleteConversation,
  getConversationWithMessages,
  listConversations,
  listMessages,
  renameConversation,
  sendUserMessageAndGenerateReply,
  serializeConversation,
  serializeMessage,
};
