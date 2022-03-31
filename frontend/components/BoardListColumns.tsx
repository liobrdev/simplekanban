import { DragDropContext, DropResult } from 'react-beautiful-dnd';

import { useAppDispatch, useAppSelector } from '@/hooks';
import { BoardCommands, IWebSocketParams } from '@/types';
import { moveTasks } from '@/utils';

import { BoardColumn, BoardCreateColumn } from './';


interface Props {
  isDemo?: boolean;
}

export default function BoardListColumns({ isDemo }: Props) {
  const { board, userRole } = useAppSelector((state) => state.board);
  const dispatch = useAppDispatch();

  const handleOnDragEnd = (result: DropResult) => {
    const { destination, draggableId, source } = result;

    if (
      !destination || (
        destination.droppableId === source.droppableId
        && destination.index === source.index
      )
    ) return;

    let tasks = board?.tasks;
    if (!tasks) return;

    tasks = moveTasks(
      +draggableId, source.index, destination.index, +source.droppableId,
      +destination.droppableId, tasks,
    );

    dispatch({ type: 'SUCCESS_SAVE_TASKS', tasks });
    dispatch({ type: 'TASK_FORM_CLOSE' });
    dispatch({ type: 'TASK_SCROLL_INTO_VIEW', task_id: draggableId });

    if (isDemo) return;

    const params: IWebSocketParams = {
      task_id: +draggableId,
      column_id: +destination.droppableId,
      task_index: destination.index,
    };

    dispatch({
      type: 'START_WS_COMMAND',
      wsCommand: BoardCommands.MOVE_TASK,
      wsParams: params,
    });
  };

  const hasColumns =
    Array.isArray(board?.columns) && !!board?.columns.length;

  const canAddToEmptyBoard = !hasColumns && (
    isDemo || (userRole === 1 || userRole === 2)
  );

  const cannotAddToEmptyBoard =
    !hasColumns && !isDemo && !(userRole === 1 || userRole === 2);

  return board ? (
    <div className='BoardListColumns'>
      {(hasColumns || canAddToEmptyBoard) && (
        <DragDropContext onDragEnd={handleOnDragEnd}>
          <ul className='BoardListColumns-list'>
            {board.columns
              .sort((a, b) => a.column_index - b.column_index)
              .map(column => (
                <li
                  className='BoardListColumns-list-item'
                  key={column.column_id}
                >
                  <BoardColumn column={column} isDemo={isDemo} />
                </li>
              ))
            }
            {(isDemo || userRole === 1 || userRole === 2) && (
              <li className='BoardListColumns-list-item'>
                <BoardCreateColumn isDemo={isDemo} />
              </li>
            )}
          </ul>
        </DragDropContext>
      )}
      {cannotAddToEmptyBoard && (
        <p className='BoardListColumns-empty-message'>
          There are no columns on this board yet.
          Talk to the admin or a moderator of this project
          in order to get started!
        </p>
      )}
    </div>
  ) : null;
}