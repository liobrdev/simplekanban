import { MouseEvent, useEffect, useRef } from 'react';
import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock';

import { useAppDispatch, useAppSelector } from '@/hooks';


export default function AccountModal() {
  const { accountModal } = useAppSelector((state) => state.account);
  const dispatch = useAppDispatch();

  const thisComponent = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (accountModal && thisComponent.current) {
      disableBodyScroll(thisComponent.current);
    } else if (thisComponent.current) {
      enableBodyScroll(thisComponent.current);
    }
  }, [accountModal, thisComponent])

  const handleLeftButton = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (accountModal?.leftButton) {
      const { action } = accountModal.leftButton;
      dispatch(action);
    } else {
      if (thisComponent.current) enableBodyScroll(thisComponent.current);
      dispatch({ type: 'ACCOUNT_MODAL_CLOSE' });
    }
  };

  const handleRightButton = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (accountModal?.rightButton) {
      const { action } = accountModal.rightButton;
      dispatch(action);
    }
  };

  const handleClose = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (thisComponent.current) enableBodyScroll(thisComponent.current);
    dispatch({ type: 'ACCOUNT_MODAL_CLOSE' });
  };

  const leftButtonText = accountModal?.leftButton?.text || 'Close';
  const rightButtonText = accountModal?.rightButton?.text;

  return !accountModal ? null : (
    <div className='AccountModal' ref={thisComponent}>
      <div className='AccountModal-overlay' onClick={handleClose} />
      <div className='AccountModal-modal'>
        <div className='AccountModal-modal-message'>
          {accountModal.message}
        </div>
        <div className='AccountModal-modal-buttons'>
          <button
            className='AccountModal-modal-button AccountModal-button--left'
            type='button'
            onClick={handleLeftButton}
            autoFocus
          >
            {leftButtonText}
          </button>
          {!!accountModal.rightButton && (
            <button
              className='AccountModal-modal-button AccountModal-button--right'
              type='button'
              onClick={handleRightButton}
            >
              {rightButtonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}