const express = require('express');
const workspaceController = require('../controllers/workspace.controller');
const authenticate = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const validateParams = require('../middleware/validateParams.middleware');
const {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceIdParamSchema,
  inviteCodeParamSchema,
  removeMemberParamSchema,
} = require('../validators/workspace.validator');

const router = express.Router();

// All workspace routes require authentication
router.use(authenticate);

// Workspace collection routes
router.post('/', validate(createWorkspaceSchema), workspaceController.createWorkspace);
router.get('/', workspaceController.getUserWorkspaces);

// Workspace invitation join route
router.post(
  '/join/:inviteCode',
  validateParams(inviteCodeParamSchema),
  workspaceController.joinWorkspace
);

// Single workspace routes
router.get('/:id', validateParams(workspaceIdParamSchema), workspaceController.getWorkspaceById);
router.get('/:id/members', validateParams(workspaceIdParamSchema), workspaceController.getWorkspaceMembers);
router.put(
  '/:id',
  validateParams(workspaceIdParamSchema),
  validate(updateWorkspaceSchema),
  workspaceController.updateWorkspace
);
router.delete(
  '/:id',
  validateParams(workspaceIdParamSchema),
  workspaceController.deleteWorkspace
);

// Workspace invite code generation
router.post(
  '/:id/invite',
  validateParams(workspaceIdParamSchema),
  workspaceController.generateInviteCode
);

// Workspace member removal or departure
router.delete(
  '/:id/members/:userId',
  validateParams(removeMemberParamSchema),
  workspaceController.removeWorkspaceMember
);

module.exports = router;
