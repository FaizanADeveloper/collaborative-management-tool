const express = require('express');
const boardController = require('../controllers/board.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const validateParams = require('../middleware/validateParams.middleware');
const {
  createBoardSchema,
  workspaceIdParamSchema,
  boardIdParamSchema,
} = require('../validators/board.validator');

const router = express.Router();

// Workspace-scoped board routes
router.post(
  '/workspaces/:workspaceId/boards',
  authenticate,
  validateParams(workspaceIdParamSchema),
  validate(createBoardSchema),
  boardController.createBoard
);
router.get(
  '/workspaces/:workspaceId/boards',
  authenticate,
  validateParams(workspaceIdParamSchema),
  boardController.getWorkspaceBoards
);

// Direct board routes
router.get(
  '/boards/:id',
  authenticate,
  validateParams(boardIdParamSchema),
  boardController.getBoardById
);

module.exports = router;
