import { FormEvent, MouseEvent, useState } from 'react';

import { useAppDispatch, useAppSelector } from '@/hooks';
import { BoardCommands, IWebSocketParams } from '@/types';

import { CloseIcon, Input } from './';


export default function BoardFormInviteUser() {
  const { boardModal, isSending } = useAppSelector((state) => state.board);
  const dispatch = useAppDispatch();

  const [form, setForm] = useState({ invite_email: '' });

  const buttonsDisabled = isSending || !!boardModal;

  const handleClose = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    dispatch({ type: 'INVITE_FORM_CLOSE' });
  };

  const handleInput = (e: FormEvent<HTMLInputElement>) => {
    e.preventDefault();
    const invite_email = (e.target as HTMLInputElement).value;
    setForm({ invite_email });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const wsCommand = BoardCommands.INVITE;
    const wsParams: IWebSocketParams = { ...form };
    dispatch({ type: 'START_WS_COMMAND', wsCommand, wsParams });
  };

  return (
    <form
      className='BoardFormInviteUser'
      onSubmit={
        !buttonsDisabled && form.invite_email ?
        handleSubmit : undefined
      }
    >
      <div className='CloseIcon-container'>
        <CloseIcon
          onClick={handleClose}
          disabled={buttonsDisabled}
          type='button'  
        />
      </div>
      <Input
        className='BoardFormInviteUser-input'
        label={
          'Enter the email address of whomever you ' +
          'would like to invite to this project'
        }
        type='email'
        name='invite_email'
        minLength={1}
        maxLength={50}
        onChange={handleInput}
        disabled={buttonsDisabled}
        autoFocus
        required
      />
      <button
        className='BoardFormInviteUser-button'
        type='submit'
        disabled={buttonsDisabled || !form.invite_email}
      >
        Send
      </button>
    </form>
  );
}