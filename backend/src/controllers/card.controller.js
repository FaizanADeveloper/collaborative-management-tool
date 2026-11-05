const cardService = require('../services/card.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Create a new card in a list
 * POST /api/lists/:listId/cards
 */
const createCard = asyncHandler(async (req, res) => {
  const result = await cardService.createCard(
    req.params.listId,
    req.body,
    req.user._id
  );

  res.status(201).json({
    success: true,
    status: 'success',
    message: 'Card created successfully',
    data: {
      card: result,
    },
  });
});

/**
 * Get all cards in a list
 * GET /api/lists/:listId/cards
 */
const getListCards = asyncHandler(async (req, res) => {
  const result = await cardService.getListCards(
    req.params.listId,
    req.user._id
  );

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Cards retrieved successfully',
    data: {
      cards: result,
    },
  });
});

/**
 * Get card details by ID
 * GET /api/cards/:id
 */
const getCardById = asyncHandler(async (req, res) => {
  const result = await cardService.getCardById(req.params.id, req.user._id);

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Card retrieved successfully',
    data: {
      card: result,
    },
  });
});

/**
 * Update card details
 * PATCH /api/cards/:id and PUT /api/cards/:id
 */
const updateCard = asyncHandler(async (req, res) => {
  const result = await cardService.updateCard(
    req.params.id,
    req.body,
    req.user._id
  );

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Card updated successfully',
    data: {
      card: result,
    },
  });
});

/**
 * Delete a card
 * DELETE /api/cards/:id
 */
const deleteCard = asyncHandler(async (req, res) => {
  await cardService.deleteCard(req.params.id, req.user._id);

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Card deleted successfully',
    data: null,
  });
});

module.exports = {
  createCard,
  getListCards,
  getCardById,
  updateCard,
  deleteCard,
};
