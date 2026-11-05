const express = require('express');
const listController = require('../controllers/list.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const validateParams = require('../middleware/validateParams.middleware');
const {
  createListSchema,
  updateListSchema,
  boardIdParamSchema,
  listIdParamSchema,
} = require('../validators/list.validator');

const router = express.Router();

// Board-scoped list routes
router.post(
  '/boards/:boardId/lists',
  authenticate,
  validateParams(boardIdParamSchema),
  validate(createListSchema),
  listController.createList
);
router.get(
  '/boards/:boardId/lists',
  authenticate,
  validateParams(boardIdParamSchema),
  listController.getBoardLists
);

// Direct list routes
router.patch(
  '/lists/:id',
  authenticate,
  validateParams(listIdParamSchema),
  validate(updateListSchema),
  listController.updateList
);
router.put(
  '/lists/:id',
  authenticate,
  validateParams(listIdParamSchema),
  validate(updateListSchema),
  listController.updateList
);
router.delete(
  '/lists/:id',
  authenticate,
  validateParams(listIdParamSchema),
  listController.deleteList
);

module.exports = router;
