import { FormEvent } from 'react';

import { useAppDispatch, useAppSelector } from '@/hooks';
import { BoardCommands, ITask, IWebSocketParams } from '@/types';

import { Input } from './';


interface Props {
  task?: ITask;
  formOn: boolean;
}

export default function BoardTaskTest({ task, formOn }: Props) {
  const {
    boardModal,
    isSending,
    taskForm,
  } = useAppSelector((state) => state.board);
  const dispatch = useAppDispatch();

  const handleInput = (e: FormEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = (e.target as HTMLInputElement).value;
    dispatch({ type: 'TASK_FORM_INPUT', text });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const wsCommand =
      task ? BoardCommands.UPDATE_TASK : BoardCommands.CREATE_TASK;
    const wsParams: IWebSocketParams = { ...taskForm };
    dispatch({ type: 'START_WS_COMMAND', wsCommand, wsParams });
  };

  const buttonsDisabled = isSending || !!boardModal;

  return (
    <div className={`BoardTaskText${formOn ? ' is-on' : ''}`}>
      {formOn ? (
        <form
          className='BoardTaskText-form'
          id='boardTaskTextForm'
          onSubmit={!isSending ? handleSubmit : undefined}
        >
          <Input
            className='BoardTaskText-form-input'
            type='text'
            name='text'
            value={taskForm?.text}
            disabled={buttonsDisabled}
            minLength={1}
            maxLength={80}
            onChange={handleInput}
            autoFocus
            required
          />
        </form>
      ) : (
        <div className='BoardTaskText-text'>{task?.text}</div>
      )}
    </div>
  );
}