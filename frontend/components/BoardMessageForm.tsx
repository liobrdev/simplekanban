import { FormEvent, useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '@/hooks';
import {
  BoardCommands,
  IAction,
  IButton,
  IModal,
  IWebSocketParams,
} from '@/types';

import { Input, SendIcon } from './';


interface Props {
  isDemo?: boolean;
}

export default function BoardMessageForm({ isDemo }: Props) {
  const {
    board,
    boardModal,
    isSending,
    msgFormWillClear,
  } = useAppSelector((state) => state.board);
  const dispatch = useAppDispatch();

  const [form, setForm] = useState({ board_msg: '' });

  useEffect(() => {
    if (msgFormWillClear) {
      setForm({ board_msg: '' });
      dispatch({ type: 'MSG_FORM_RESET' });
    }
  }, [dispatch, msgFormWillClear, setForm]);

  const handleInput = (e: FormEvent<HTMLInputElement>) => {
    e.preventDefault();
    const board_msg = (e.target as HTMLInputElement).value;
    setForm({ board_msg });
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isDemo) {
      const message = 'Create an account to collaborate today!';
      const action: IAction = { type: 'LOGIN_FROM_DEMO' };
      const rightButton: IButton = { action, text: 'Sign up' };
      const boardModal: IModal = { page: 'board', message, rightButton };
      dispatch({ type: 'BOARD_MODAL_SHOW', boardModal });
    } else {
      const wsCommand = BoardCommands.CREATE_MSG;
      const wsParams: IWebSocketParams = { ...form };
      dispatch({ type: 'START_WS_COMMAND', wsCommand, wsParams });
    }
  }

  const buttonsDisabled = isSending || !!boardModal;

  const canSubmit = !buttonsDisabled && (
    isDemo || (!!board?.messages_allowed && !!form.board_msg)
  );

  return (
    <form
      className='BoardListMessages-form'
      id='formBoardListMessages'
      onSubmit={canSubmit ? handleSubmit : undefined}
    >
      <Input
        className='BoardListMessages-form-input'
        type='text'
        name='board_msg'
        value={form.board_msg}
        minLength={1}
        maxLength={255}
        disabled={buttonsDisabled}
        onChange={handleInput}
        placeholder='Send messages'
        required={!isDemo}
        title='Send messages'
        autoFocus
      />
      <SendIcon
        className='BoardListMessages-form-button'
        type='submit'
        disabled={!canSubmit}
        src='/send-red.png'
      />
    </form>
  );
}