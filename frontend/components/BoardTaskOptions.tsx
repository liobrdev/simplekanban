import { MouseEvent } from 'react';

import { useAppDispatch, useAppSelector } from '@/hooks';
import { ITask, ITaskForm } from '@/types';

import { BoardTaskButtons } from './';


interface Props {
  task: ITask;
  formOn: boolean;
}

export default function BoardTaskOptions({ task, formOn }: Props) {
  const { boardModal, isSending } = useAppSelector((state) => state.board);
  const dispatch = useAppDispatch();

  const handleShow = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
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

  const buttonsDisabled = isSending || !!boardModal;

  return (
    <div className={`BoardTaskOptions${formOn ? ' is-on' : ''}`}>
      <button
        className='BoardTaskOptions-icon'
        type='button'
        onClick={formOn ? handleClose : handleShow}
        disabled={buttonsDisabled}
        >
        <span className='BoardTaskOptions-icon BoardTaskOptions-icon---line1'/>
        <span className='BoardTaskOptions-icon BoardTaskOptions-icon---line2'/>
        <span className='BoardTaskOptions-icon BoardTaskOptions-icon---line3'/>
      </button>
      <br/>
      <br/>
      {formOn && <BoardTaskButtons task={task} disabled={buttonsDisabled} />}
    </div>
  );
}