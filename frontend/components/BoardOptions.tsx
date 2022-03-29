import { MouseEvent, useRef, useState } from 'react';
import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock';

import { useAppDispatch, useAppSelector } from '@/hooks';
import { IAction, IButton, IModal } from '@/types';

import {
  BoardListMembers,
  BoardListMessages,
  BoardMessageForm,
  MenuIcon,
} from './';


interface Props {
  isDemo?: boolean;
  isHidden?: boolean;
}

export default function BoardOptions({ isDemo, isHidden }: Props) {
  const {
    boardModal,
    boardOptionsOn,
    isSending,
  } = useAppSelector((state) => state.board);
  const dispatch = useAppDispatch();

  const thisComponent = useRef<HTMLDivElement>(null);
  const [leftTab, setTabs] = useState(true);

  const handleShow = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (thisComponent.current) disableBodyScroll(thisComponent.current);
    dispatch({ type: 'BOARD_OPTIONS_SHOW' });
  };

  const handleClose = (e: MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
    e.preventDefault();
    if (thisComponent.current) enableBodyScroll(thisComponent.current);
    dispatch({ type: 'BOARD_OPTIONS_CLOSE' });
  };

  const handleTabs = (e: MouseEvent<HTMLButtonElement>, bool: boolean) => {
    e.preventDefault();
    if (isDemo) {
      const message = 'Create an account to collaborate today!';
      const action: IAction = { type: 'LOGIN_FROM_DEMO' };
      const rightButton: IButton = { action, text: 'Sign up' };
      const boardModal: IModal = { page: 'board', message, rightButton };
      dispatch({ type: 'BOARD_MODAL_SHOW', boardModal });
    } else setTabs(bool);
  };

  const buttonsDisabled = isSending || !!boardModal;

  const rootClass = 'BoardOptions';

  return (
    <>
      {boardOptionsOn && (
        <div className={`${rootClass}-overlay`} onClick={handleClose} />
      )}
      <div
        className={`${
          rootClass
        }${
          boardOptionsOn ? ' is-on' : ''
        }${
          isHidden ? ' is-hidden' : ''
        }`}
        ref={thisComponent}
      >
        <div className={`${rootClass}-button MenuIcon-container`}>
          <MenuIcon
            className={boardOptionsOn ? ' is-active' : ''}
            onClick={boardOptionsOn ? handleClose : handleShow}
            type='button'
            title={boardOptionsOn ? 'Close' : 'Options'}
            disabled={buttonsDisabled}
          />
        </div>
        {boardOptionsOn && (
          <div className={`${rootClass}-tabs`}>
            <div className={`${rootClass}-tabs-buttons`}>
              <button
                className={
                  `${
                    rootClass
                  }-tabs-buttons-button${
                    leftTab ? ' is-active' : ''
                  }`
                }
                onClick={e => handleTabs(e, true)}
                type='button'
                disabled={buttonsDisabled}
              >
                Chat
              </button>
              <button
                className={
                  `${
                    rootClass
                  }-tabs-buttons-button${
                    !leftTab ? ' is-active' : ''
                  }`
                }
                onClick={e => handleTabs(e, false)}
                type='button'
                disabled={buttonsDisabled}
              >
                Members
              </button>
            </div>
            <BoardListMessages isHidden={!leftTab} />
            {leftTab && <BoardMessageForm isDemo={isDemo} />}
            <BoardListMembers isHidden={leftTab} />
          </div>
        )}
      </div>
    </>
  );
}