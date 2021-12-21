import { FormEvent, MouseEvent } from 'react';

import { useAppDispatch, useAppSelector } from '@/hooks';
import { BoardCommands, IColumn, IWebSocketParams } from '@/types';

import { BoardColumnButtons, Input, SliderCheckbox } from './';


interface Props {
  column: IColumn;
  disabled: boolean;
}

export default function BoardColumnOptions({ column, disabled }: Props) {
  const { columnMenu, isSending } = useAppSelector((state) => state.board);
  const dispatch = useAppDispatch();

  const handleInput = (e: FormEvent<HTMLInputElement>) => {
    e.preventDefault();
    const name: string = (e.target as HTMLInputElement).name;
    const value: number = +(e.target as HTMLInputElement).value;
    dispatch({ type: 'COLUMN_MENU_INPUT', name, value });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const wsCommand = BoardCommands.UPDATE_COLUMN;
    const wsParams: IWebSocketParams = { ...columnMenu };
    dispatch({ type: 'START_WS_COMMAND', wsCommand, wsParams });
  };

  const handleToggleWIP = (e: FormEvent<HTMLInputElement>) => {
    const checked = (e.target as HTMLInputElement).checked;
    const name = 'wip_limit_on';

    if (checked) {
      dispatch({ type: 'COLUMN_MENU_INPUT', name, value: true });
    } else {
      dispatch({ type: 'COLUMN_MENU_INPUT', name, value: false });
    }
  };

  const rootClass = 'BoardColumnOptions';

  return (
    <div className={rootClass}>
      <form
        className={`${rootClass}-form`}
        id='boardColumnOptionsForm'
        onSubmit={!isSending ? handleSubmit : undefined}
      >
        <SliderCheckbox
          className={`${rootClass}-form-input ${rootClass}-form-input--wipLimitOn`}
          label='Limit tasks?'
          type='checkbox'
          name='wip_limit_on'
          checked={columnMenu?.wip_limit_on}
          onChange={handleToggleWIP}
          disabled={disabled}
        />
        <Input
          className={`${rootClass}-form-input ${rootClass}-form-input--wipLimit`}
          label='Task limit'
          type='number'
          name='wip_limit'
          min={0}
          value={columnMenu?.wip_limit}
          onChange={handleInput}
          disabled={disabled || !columnMenu?.wip_limit_on}
        />
        <BoardColumnButtons column={column} disabled={disabled} />
      </form>
    </div>
  );
}