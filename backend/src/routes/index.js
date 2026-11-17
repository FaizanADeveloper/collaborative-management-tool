const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const workspaceRoutes = require('./workspace.routes');
const boardRoutes = require('./board.routes');
const listRoutes = require('./list.routes');
const cardRoutes = require('./card.routes');
const commentRoutes = require('./comment.routes');
const searchRoutes = require('./search.routes');

const router = express.Router();

// Mount sub-routers
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/', boardRoutes);
router.use('/', listRoutes);
router.use('/', cardRoutes);
router.use('/', commentRoutes);
router.use('/', searchRoutes);

module.exports = router;
