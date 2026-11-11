import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useBoardStore } from '../store/useBoardStore';
import { KanbanBoard } from '../components/kanban/KanbanBoard';

export const ProjectDetailsPage = () => {
  const { boardId, projectId } = useParams();
  const targetBoardId = boardId || projectId;
  const navigate = useNavigate();
  const { activeBoardId, setActiveBoardId } = useBoardStore();

  useEffect(() => {
    if (targetBoardId && targetBoardId !== activeBoardId) {
      setActiveBoardId(targetBoardId);
    }
  }, [targetBoardId, activeBoardId, setActiveBoardId]);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => navigate('/boards')}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>All Boards</span>
      </button>

      <KanbanBoard />
    </div>
  );
};
