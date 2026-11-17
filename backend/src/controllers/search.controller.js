const searchService = require('../services/search.service');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Execute full-text search across workspace content (cards, boards, lists)
 * GET /api/workspaces/:workspaceId/search
 */
const searchWorkspace = asyncHandler(async (req, res) => {
  const result = await searchService.searchWorkspace(
    req.params.workspaceId,
    req.query,
    req.user._id
  );

  res.status(200).json({
    success: true,
    status: 'success',
    message: 'Search completed successfully',
    data: result,
  });
});

module.exports = {
  searchWorkspace,
};
