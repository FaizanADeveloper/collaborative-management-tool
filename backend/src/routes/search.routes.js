const express = require('express');
const searchController = require('../controllers/search.controller');
const authenticate = require('../middleware/auth.middleware');
const validateParams = require('../middleware/validateParams.middleware');
const validateQuery = require('../middleware/validateQuery.middleware');
const {
  workspaceIdParamSchema,
  searchQuerySchema,
} = require('../validators/search.validator');

const router = express.Router();

/**
 * Full-text search across workspace content (boards, lists, cards)
 * GET /api/workspaces/:workspaceId/search
 */
router.get(
  '/workspaces/:workspaceId/search',
  authenticate,
  validateParams(workspaceIdParamSchema),
  validateQuery(searchQuerySchema),
  searchController.searchWorkspace
);

module.exports = router;
