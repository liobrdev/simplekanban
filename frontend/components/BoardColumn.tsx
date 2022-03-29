import { MouseEvent } from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';

import { useAppDispatch, useAppSelector } from '@/hooks';
import { IColumn, IColumnMenu, ITask, ITaskForm } from '@/types';

import {
  BoardColumnOptions,
  BoardColumnTitle,
  BoardTask,
  CheckIcon,
  MenuIcon,
  PlusIcon,
} from './';


interface Props {
  column: IColumn;
  isDemo?: boolean;
}

export default function BoardColumn({ column, isDemo }: Props) {
  const {
    board,
    boardModal,
    columnForm,
    columnMenu,
    taskForm,
    isSending,
    userRole,
  } = useAppSelector((state) => state.board);
  const dispatch = useAppDispatch();

  let tasks: ITask[] = [];

  if (!!board?.tasks?.length && Array.isArray(board?.tasks)) {
    tasks = board.tasks
      .filter(task => task.column === column.column_id)
      .sort((a, b) => a.task_index - b.task_index);
  }

  const handleShowOptions = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const menu: IColumnMenu = {
      column_id: column.column_id,
      wip_limit_on: column.wip_limit_on,
      wip_limit: column.wip_limit,
    };
    dispatch({ type: 'COLUMN_MENU_SHOW', columnMenu: menu });
  };

  const handleShowNewTask = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const form: ITaskForm = {
      column_id: column.column_id,
      text: '',
    };
    dispatch({ type: 'TASK_FORM_SHOW', taskForm: form });
  };

  const handleClose = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    dispatch({ type: 'COLUMN_MENU_CLOSE' });
  };

  const isCreatingTask = (
    !!taskForm && !taskForm.task_id &&
    typeof taskForm.column_id === 'number' &&
    taskForm.column_id === column?.column_id &&
    typeof taskForm.text === 'string'
  );

  const formOn = (
    typeof columnForm?.column_id === 'number' &&
    columnForm.column_id === column.column_id &&
    typeof columnForm.column_title === 'string'
  );

  const menuOn = (
    typeof columnMenu?.column_id === 'number' &&
    columnMenu.column_id === column?.column_id &&
    typeof columnMenu.wip_limit === 'number' &&
    typeof columnMenu.wip_limit_on === 'boolean'
  );

  const buttonsDisabled = isSending || !!boardModal;

  const icons = (
    <div className='BoardColumnOptions-icon-container'>
      {!formOn && (
        <MenuIcon
          className={menuOn ? ' is-active' : ''}
          type='button'
          title={menuOn ? 'Close' : 'Options'}
          disabled={buttonsDisabled}
          onClick={menuOn ? handleClose : handleShowOptions}
        />
      )}
      {formOn && (
        <CheckIcon
          type='submit'
          title='Save column'
          color='wh'
          form={`boardColumnTitleForm_${column.column_id}`}
          disabled={buttonsDisabled}
        />
      )}
    </div>
  );

  const numTasks =
    board?.tasks.filter(task => task.column === column.column_id).length

  const isOverWipLimit =
    !!column.wip_limit_on && !!numTasks && numTasks > column.wip_limit;

  const wipRatio = !formOn && !menuOn && column.wip_limit_on ? (
    <button
      className={`BoardColumnWipRatio${isOverWipLimit ? ' is-overLimit' : ''}`}
      title='Task limit'
    >
      {numTasks} / {column.wip_limit}
      {isOverWipLimit && <span>!!!</span>}
    </button>
  ) : null;

  return (
    <div className={`BoardColumn${
      formOn ? ' is-editingTitle' : ''
    }${
      menuOn ? ' is-editingOptions' : ''
    }${
      isOverWipLimit ? ' is-overLimit' : ''
    }`}>
      <div className='BoardColumnTopPanel'>
        <BoardColumnTitle column={column} formOn={formOn} />
        {isDemo || userRole === 1 || userRole === 2 ? icons : null}
        {wipRatio}
        {menuOn && (
          <BoardColumnOptions
            column={column}
            disabled={buttonsDisabled}
            isDemo={isDemo}
          />
        )}
      </div>
      <Droppable droppableId={'' + column.column_id}>
        {(provided) => (
          <ul
            ref={provided.innerRef}
            { ...provided.droppableProps }
            className='BoardColumnListTasks'
          >
            {tasks
              .sort((a, b) => a.task_index - b.task_index)
              .map((task) => (
                <Draggable
                  draggableId={'' + task.task_id}
                  index={task.task_index}
                  key={task.task_id}
                >
                  {(provided) => (
                    <li
                      ref={provided.innerRef}
                      { ...provided.draggableProps }
                      { ...provided.dragHandleProps }
                      className='BoardColumnListTasks-item'
                    >
                      <BoardTask task={task} />
                    </li>
                  )}
                </Draggable>
              ))
            }
            {provided.placeholder}
            {isCreatingTask && (
              <li className='BoardColumnListTasks-item'>
                <BoardTask isCreating />
              </li>
            )}
          </ul>
        )}
      </Droppable>
      <div className='PlusIcon-container'>
        <PlusIcon
          onClick={handleShowNewTask}
          type='button'
          title='Add a new task'
          disabled={buttonsDisabled}
        />
      </div>
    </div>
  );
}