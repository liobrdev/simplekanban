import { MouseEvent } from 'react';

import { useAppDispatch, useAppSelector } from '@/hooks';
import { BoardCommands, ITask, IWebSocketParams } from '@/types';
import { checkAdjacentColumns, moveTasks } from '@/utils';

import { CheckIcon, LeftArrowIcon, RightArrowIcon, TrashIcon } from './'


interface Props {
  task?: ITask;
  disabled?: boolean;
  isDemo?: boolean;
}
  
export default function BoardTaskButtons({ task, disabled, isDemo }: Props) {
  const { board } = useAppSelector((state) => state.board);
  const dispatch = useAppDispatch();
  
  const {
    leftColumn,
    rightColumn,
  } = checkAdjacentColumns(task?.column, board?.columns);

  const handleDelete = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!task) return;

    if (isDemo) {
      dispatch({
        type: 'TASK_DELETE',
        column_id: task.column,
        task_index: task.task_index,
      });
    } else {
      const wsParams: IWebSocketParams = { task_id: task.task_id };

      dispatch({
        type: 'START_WS_COMMAND',
        wsCommand: BoardCommands.DELETE_TASK,
        wsParams,
      });
    }
  };

  const handleMove = (e: MouseEvent<HTMLButtonElement>, column_id: number) => {
    e.preventDefault();
    if (!board?.tasks || !task) return;
  
    if (isDemo) {
      const tasks = moveTasks(
        task.task_id, task.task_index, task.task_index, task.column,
        column_id, board.tasks,
      );
      dispatch({ type: 'SUCCESS_SAVE_TASKS', tasks });
    } else {
      const wsParams: IWebSocketParams = {
        task_id: task.task_id,
        task_index: task.task_index,
        column_id,
      };

      dispatch({
        type: 'START_WS_COMMAND',
        wsCommand: BoardCommands.MOVE_TASK,
        wsParams,
      });
    }
  };

  const buttonMoveTaskLeft = task && leftColumn ? (
    <div className='BoardTaskButton BoardTaskButton--moveLeft'>
      <LeftArrowIcon
        onClick={e => handleMove(e, leftColumn.column_id)}
        src='/left-arrow-wh.png'
        type='button'
        title={`Move task to column "${leftColumn.column_title}"`}
        disabled={disabled}
      />
    </div>
  ) : null;
  
  const buttonSubmitTask = (
    <div className='BoardTaskButton BoardTaskButton--submit'>
      <CheckIcon
        type='submit'
        form='boardTaskTextForm'
        title='Save changes'
        color='wh'
        disabled={disabled}
      />
    </div>
  );

  const buttonDeleteTask = task ? (
    <div className='BoardTaskButton BoardTaskButton--delete'>
      <TrashIcon
        type='button'
        onClick={handleDelete}
        disabled={disabled}
        title='Delete task'
      />
    </div>
  ) : null;

  const buttonMoveTaskRight = task && rightColumn ? (
    <div className='BoardTaskButton BoardTaskButton--moveRight'>
      <RightArrowIcon
        onClick={e => handleMove(e, rightColumn.column_id)}
        src='/right-arrow-wh.png'
        type='button'
        title={`Move task to column "${rightColumn.column_title}"`}
        disabled={disabled}
      />
    </div>
  ) : null;

  return (
    <div className='BoardTaskButtons'>
      {buttonMoveTaskLeft}
      {buttonSubmitTask}
      {buttonDeleteTask}
      {buttonMoveTaskRight}
    </div>
  );
}