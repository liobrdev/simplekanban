import { MouseEvent, useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '@/hooks';
import { ITask, ITaskForm } from '@/types';

import { BoardTaskButtons, BoardTaskText, MenuIcon } from './';


interface Props {
  isCreating?: boolean;
  task?: ITask;
}

export default function BoardTask({ isCreating, task }: Props) {
  const {
    boardModal,
    isSending,
    taskForm,
  } = useAppSelector((state) => state.board);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (isCreating && taskForm) {
      const tasksList = document.body.querySelector(
        `[data-rbd-droppable-id='${taskForm.column_id}']`
      );
      if (tasksList) tasksList.scrollTop = tasksList.scrollHeight;
    }
  }, [isCreating, taskForm]);

  const handleShow = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!task) return;
    const form: ITaskForm = {
      column_id: task.column,
      task_id: task.task_id,
      text: task.text,
    }
    dispatch({ type: 'TASK_FORM_SHOW', taskForm: form });
  };

  const handleClose = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    dispatch({ type: 'TASK_FORM_CLOSE' });
  };

  const isEditing = (
    typeof taskForm?.task_id === 'number' &&
    taskForm.task_id === task?.task_id &&
    typeof taskForm.column_id === 'number' &&
    taskForm.column_id === task.column &&
    typeof taskForm.text === 'string'
  );

  const formOn = isCreating || isEditing;

  const buttonsDisabled = isSending || !!boardModal;

  return (
    <div className={`BoardTask${formOn ? ' is-on' : ''}`}>
      <div className='BoardTaskTopPanel'>
        <BoardTaskText task={task} formOn={formOn} />
        <div className='MenuIcon-container'>
          <MenuIcon
            className={formOn ? 'is-active' : ''}
            type='button'
            title={formOn ? 'Close' : 'Options'}
            disabled={buttonsDisabled}
            onClick={formOn ? handleClose : handleShow}
          />
        </div>
      </div>
      {formOn && <BoardTaskButtons task={task} disabled={buttonsDisabled} />}
    </div>
  );
}