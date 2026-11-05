const express = require('express');
const cardController = require('../controllers/card.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const validateParams = require('../middleware/validateParams.middleware');
const {
  createCardSchema,
  updateCardSchema,
  listIdParamSchema,
  cardIdParamSchema,
} = require('../validators/card.validator');

const router = express.Router();

// List-scoped card routes
router.post(
  '/lists/:listId/cards',
  authenticate,
  validateParams(listIdParamSchema),
  validate(createCardSchema),
  cardController.createCard
);
router.get(
  '/lists/:listId/cards',
  authenticate,
  validateParams(listIdParamSchema),
  cardController.getListCards
);

// Direct card routes
router.get(
  '/cards/:id',
  authenticate,
  validateParams(cardIdParamSchema),
  cardController.getCardById
);
router.patch(
  '/cards/:id',
  authenticate,
  validateParams(cardIdParamSchema),
  validate(updateCardSchema),
  cardController.updateCard
);
router.put(
  '/cards/:id',
  authenticate,
  validateParams(cardIdParamSchema),
  validate(updateCardSchema),
  cardController.updateCard
);
router.delete(
  '/cards/:id',
  authenticate,
  validateParams(cardIdParamSchema),
  cardController.deleteCard
);

module.exports = router;
