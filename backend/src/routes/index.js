const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const workspaceRoutes = require('./workspace.routes');
const boardRoutes = require('./board.routes');
const listRoutes = require('./list.routes');

const router = express.Router();

// Mount sub-routers
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/', boardRoutes);
router.use('/', listRoutes);

module.exports = router;
