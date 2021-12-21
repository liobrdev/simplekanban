import { MouseEvent } from 'react';

import { useAppDispatch, useAppSelector } from '@/hooks';


export default function BoardModal() {
  const { boardModal } = useAppSelector((state) => state.board);
  const dispatch = useAppDispatch();

  const handleLeftButton = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (boardModal?.leftButton) {
      const { action } = boardModal.leftButton;
      dispatch(action);
    } else {
      dispatch({ type: 'BOARD_MODAL_CLOSE' });
    }
  };

  const handleRightButton = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (boardModal?.rightButton) {
      const { action } = boardModal.rightButton;
      dispatch(action);
    }
  };

  const handleClose = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    dispatch({ type: 'BOARD_MODAL_CLOSE' });
  };

  const leftButtonText = boardModal?.leftButton?.text || 'Close';
  const rightButtonText = boardModal?.rightButton?.text;

  return !boardModal ? null : (
    <div className='BoardModal'>
      <div className='BoardModal-overlay' onClick={handleClose} />
      <div className='BoardModal-modal'>
        <div className='BoardModal-modal-message'>
          {boardModal.message}
        </div>
        <div className='BoardModal-modal-buttons'>
          <button
            className='BoardModal-modal-button BoardModal-button--left'
            type='button'
            onClick={handleLeftButton}
            autoFocus
          >
            {leftButtonText}
          </button>
          {!!boardModal.rightButton && (
            <button
              className='BoardModal-modal-button BoardModal-button--right'
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