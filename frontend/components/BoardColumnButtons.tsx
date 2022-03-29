import { MouseEvent } from 'react';

import { useAppDispatch, useAppSelector } from '@/hooks';
import {
  BoardCommands,
  IAction,
  IButton,
  IColumn,
  IModal,
  IWebSocketParams,
} from '@/types';
import { checkAdjacentColumns } from '@/utils';

import { CheckIcon, LeftArrowIcon, RightArrowIcon, TrashIcon } from './'


interface Props {
  column: IColumn;
  disabled?: boolean;
  isDemo?: boolean;
}
  
export default function BoardTaskButtons({ column, disabled, isDemo }: Props) {
  const { board, columnMenu } = useAppSelector((state) => state.board);
  const dispatch = useAppDispatch();
  
  const {
    leftColumn,
    rightColumn,
  } = checkAdjacentColumns(column.column_id, board?.columns);

  const handleDelete = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    const action: IAction = isDemo ? {
      type: 'COLUMN_DELETE',
      column_index: column.column_index,
    } : {
      type: 'START_WS_COMMAND',
      wsCommand: BoardCommands.DELETE_COLUMN,
      wsParams: { column_id: columnMenu?.column_id },
    };

    const rightButton: IButton = { action, text: 'Confirm' };
    const message = 'Are you sure you want to delete this column?';
    const boardModal: IModal = { page: 'board', message, rightButton };
    dispatch({ type: 'BOARD_MODAL_SHOW', boardModal });
  };
  
  const handleMove = (e: MouseEvent<HTMLButtonElement>, newIndex: number) => {
    e.preventDefault();

    if (isDemo) {
      dispatch({
        type: 'COLUMN_MOVE',
        columnId: column.column_id,
        oldIndex: column.column_index,
        newIndex,
      });
    } else {
      const wsParams: IWebSocketParams = {
        column_id: column.column_id,
        column_index: newIndex,
      };

      dispatch({
        type: 'START_WS_COMMAND',
        wsCommand: BoardCommands.MOVE_COLUMN,
        wsParams,
      });
    }
  };

  const buttonMoveColumnLeft = leftColumn ? (
    <div className='BoardColumnButton BoardColumnButton--moveRight'>
      <LeftArrowIcon
        onClick={e => handleMove(e, leftColumn.column_index)}
        src='/left-arrow-wh.png'
        type='button'
        title='Move column left'
        disabled={disabled}
      />
    </div>
  ) : null;
  
  const buttonSubmitColumn = (
    <div className='BoardColumnButton BoardColumnButton--submit'>
      <CheckIcon
        type='submit'
        form='boardColumnOptionsForm'
        title='Save changes'
        color='wh'
        disabled={disabled}
      />
    </div>
  );

  const buttonDeleteColumn =  (
    <div className='BoardColumnButton BoardColumnButton--delete'>
      <TrashIcon
        type='button'
        onClick={handleDelete}
        disabled={disabled}
        title='Delete task'
      />
    </div>
  );

  const buttonMoveColumnRight = rightColumn ? (
    <div className='BoardColumnButton BoardColumnButton--moveRight'>
      <RightArrowIcon
        onClick={e => handleMove(e, rightColumn.column_index)}
        src='/right-arrow-wh.png'
        type='button'
        title='Move column right'
        disabled={disabled}
      />
    </div>
  ) : null;

  return (
    <div className='BoardColumnButtons'>
      {buttonMoveColumnLeft}
      {buttonSubmitColumn}
      {buttonDeleteColumn}
      {buttonMoveColumnRight}
    </div>
  );
}