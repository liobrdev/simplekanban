import { MouseEvent } from 'react';

import { useAppDispatch, useAppSelector } from '@/hooks';

import { BoardFormInviteUser, PlusIcon } from './';


export default function BoardInviteUser() {
  const {
    boardModal,
    inviteFormOn,
    isSending,
    userRole,
  } = useAppSelector((state) => state.board);
  const dispatch = useAppDispatch();

  const canInvite = userRole === 1 || userRole === 2;

  const buttonsDisabled = isSending || !!boardModal;

  const handleShow = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    dispatch({ type: 'INVITE_FORM_SHOW' });
  };

  const handleClose = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    dispatch({ type: 'INVITE_FORM_CLOSE' });
  };

  const button = (
    <div className='PlusIcon-container'>
      <PlusIcon
        className='BoardInviteUser-button'
        type='button'
        title='Invite new member'
        onClick={handleShow}
        disabled={buttonsDisabled}
        autoFocus
      />
    </div>
  );

  return !canInvite ? null : (
    <div className={`BoardInviteUser${inviteFormOn ? ' is-on' : ''}`}>
      {inviteFormOn && (
        <>
          <div className='BoardInviteUser-overlay' onClick={handleClose} />
          <BoardFormInviteUser />
        </>
      )}
      {!inviteFormOn && button}
    </div>
  );
}