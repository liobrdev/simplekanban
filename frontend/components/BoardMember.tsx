import { FormEvent, MouseEvent } from 'react';

import { useAppDispatch, useAppSelector } from '@/hooks';
import {
  BoardCommands,
  IAction,
  IButton,
  IDisplayNameForm,
  IMembership,
  IModal,
  IRoleForm,
  IWebSocketParams,
} from '@/types';

import { CheckIcon, Input, MenuIcon, SliderCheckbox } from './';


interface Props {
  membership: IMembership;
}

export default function BoardMember({ membership }: Props) {
  const {
    boardModal,
    displayNameForm,
    isSending,
    roleForm,
    userRole,
  } = useAppSelector((state) => state.board);
  const { user } = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();

  // If this component corresponds to the client's own membership
  const componentIsClient = membership.user.user_slug === user?.user_slug;

  // If this component corresponds to the admin's membership
  const componentIsAdmin = membership.role === 1;

  // If this client is the admin
  const clientIsAdmin = userRole === 1;

  const displayNameFormOn = componentIsClient && !!displayNameForm;

  const roleFormOn = (
    clientIsAdmin && !componentIsAdmin && !componentIsClient &&
    !!roleForm &&
    roleForm.user_slug === membership.user.user_slug
  );

  const editOn = displayNameFormOn || roleFormOn;

  const buttonsDisabled = isSending || !!boardModal;
  
  const handleShow = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (componentIsClient) {
      const displayNameForm: IDisplayNameForm = {
        display_name: membership.display_name,
      };
      dispatch({ type: 'DISPLAY_NAME_FORM_SHOW', displayNameForm });
    } else if (clientIsAdmin) {
      const roleForm: IRoleForm = {
        user_slug: membership.user.user_slug,
        role: membership.role,
      };
      dispatch({ type: 'ROLE_FORM_SHOW', roleForm });
    }    
  };

  const handleClose = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    dispatch({ type: 'MEMBER_FORM_CLOSE' });
  };

  const handleDisplayName = (e: FormEvent<HTMLInputElement>) => {
    e.preventDefault();
    const display_name = (e.target as HTMLInputElement).value;
    dispatch({ type: 'DISPLAY_NAME_FORM_INPUT', display_name });
  };

  const handleRole = (e: FormEvent<HTMLInputElement>) => {
    if ((e.target as HTMLInputElement).checked) {
      dispatch({ type: 'ROLE_FORM_INPUT', role: 2 });
    } else dispatch({ type: 'ROLE_FORM_INPUT', role: 3 });
  };

  const handleDeleteBoard = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const message = 'Delete this board? All project info will be erased.';
    const action: IAction = {
      type: 'START_WS_COMMAND',
      wsCommand: BoardCommands.DELETE_BOARD,
    };
    const rightButton: IButton = { action, text: 'Confirm' };
    const boardModal: IModal = { message, rightButton };
    dispatch({ type: 'BOARD_MODAL_SHOW', boardModal });
  };

  const handleLeaveBoard = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const message = 'Leave this project?';
    const action: IAction = {
      type: 'START_WS_COMMAND',
      wsCommand: BoardCommands.LEAVE,
    };
    const rightButton: IButton = { action, text: 'Confirm' };
    const boardModal: IModal = { message, rightButton };
    dispatch({ type: 'BOARD_MODAL_SHOW', boardModal });
  };

  const handleRemoveMember = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const { display_name, user: { user_slug } } = membership;
    const wsParams: IWebSocketParams = { user_slug };
    const action: IAction = {
      type: 'START_WS_COMMAND',
      wsCommand: BoardCommands.REMOVE,
      wsParams,
    };
    const message = `Remove ${display_name} from board room?`;
    const rightButton: IButton = { action, text: 'Confirm' };
    const boardModal: IModal = { message, rightButton };
    dispatch({ type: 'BOARD_MODAL_SHOW', boardModal });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      displayNameForm &&
      displayNameForm.display_name !== membership.display_name
    ) {
      const wsCommand = BoardCommands.DISPLAY_NAME;
      const wsParams: IWebSocketParams = displayNameForm;
      dispatch({ type: 'START_WS_COMMAND', wsCommand, wsParams });
    } else if (roleForm && roleForm.role !== membership.role) {
      const wsCommand = BoardCommands.ROLE;
      const wsParams: IWebSocketParams = roleForm;
      dispatch({ type: 'START_WS_COMMAND', wsCommand, wsParams });
    } else {
      dispatch({ type: 'MEMBER_FORM_CLOSE' });
    }
  };

  let realName = null;

  if (componentIsClient) {
    realName = <span className='BoardMember-text-name'>&nbsp;(You)</span>;
  } else if (
    !!membership.display_name &&
    membership.display_name !== membership.user.name
  ) {
    realName = (
      <span className='BoardMember-text-name'>
        &nbsp;({membership.user.name})
      </span>
    );
  }

  return (
    <div className={`BoardMember-container${editOn ? ' is-focused' : ''}`}>
      <div className='BoardMember'>
        {(componentIsClient || clientIsAdmin) && (
          <div className='BoardMember-button MenuIcon-container'>
            <MenuIcon
              className={editOn ? ' is-active' : ''}
              onClick={editOn ? handleClose : handleShow}
              type='button'
              disabled={buttonsDisabled}
            />
          </div>
        )}
        <div className='BoardMember-text'>
          <h4 className='BoardMember-text-names'>
            <span className='BoardMember-text-displayName'>
              {membership.display_name || membership.user.name}
            </span>
            {realName}
          </h4>
          <p className='BoardMember-text-role'>
            {componentIsAdmin && (
              <span className='u-red'>Admin</span>
            )}
            {roleFormOn && roleForm?.role === 2 && (
              <span className='u-lightred'>Editor</span>
            )}
            {!roleFormOn && membership.role === 2 && (
              <span className='u-lightred'>Editor</span>
            )}
          </p>
          <p className='BoardMember-text-email'>
            {membership.user.email}
          </p>
        </div>
        {editOn && (
          <form
            className='BoardMember-form'
            onSubmit={!buttonsDisabled ? handleSubmit : undefined}
          >
            {displayNameFormOn && (
              <Input
                className='BoardMember-form-input BoardMember-form-input--displayName'
                label='Display name'
                type='text'
                name='display_name'
                value={displayNameForm?.display_name}
                disabled={buttonsDisabled}
                minLength={1}
                maxLength={50}
                onChange={handleDisplayName}
              />
            )}
            {roleFormOn && (
              <SliderCheckbox
                className='BoardMember-form-input BoardMember-form-input--role'
                label='Grant editor privileges?'
                type='checkbox'
                name='role'
                checked={roleForm?.role === 2}
                disabled={buttonsDisabled}
                onChange={handleRole}
              />
            )}
            {componentIsClient && clientIsAdmin && (
              <button
                className='BoardMember-form-button'
                type='button'
                disabled={buttonsDisabled}
                onClick={handleDeleteBoard}
                title='Delete board'
              >
                Delete board
              </button>
            )}
            {componentIsClient && !clientIsAdmin && (
              <button
                className='BoardMember-form-button'
                type='button'
                disabled={buttonsDisabled}
                onClick={handleLeaveBoard}
                title='Leave board'
              >
                Leave board
              </button>
            )}
            {!componentIsClient && clientIsAdmin && (
              <button
                className='BoardMember-form-button'
                type='button'
                disabled={buttonsDisabled}
                onClick={handleRemoveMember}
                title='Remove member'
              >
                Remove member
              </button>
            )}
            <div className='BoardMember-form-icons'>
              <div className='CheckIcon-container'>
                <CheckIcon
                  type='submit'
                  title='Save'
                  color='wh'
                  disabled={buttonsDisabled}
                />
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}