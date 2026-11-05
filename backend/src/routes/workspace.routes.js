const express = require('express');
const workspaceController = require('../controllers/workspace.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const validateParams = require('../middleware/validateParams.middleware');
const {
  createWorkspaceSchema,
  workspaceIdParamSchema,
} = require('../validators/workspace.validator');

const router = express.Router();

// All workspace routes require authentication
router.use(authenticate);

router.post('/', validate(createWorkspaceSchema), workspaceController.createWorkspace);
router.get('/', workspaceController.getUserWorkspaces);
router.get('/:id', validateParams(workspaceIdParamSchema), workspaceController.getWorkspaceById);

module.exports = router;
