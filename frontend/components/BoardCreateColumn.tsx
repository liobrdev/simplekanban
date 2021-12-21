import { FormEvent, MouseEvent } from 'react';

import { useAppDispatch, useAppSelector } from '@/hooks';
import { BoardCommands, IColumnForm } from '@/types';

import { CloseIcon, CheckIcon, Input, PlusIcon, SliderCheckbox } from './';


export default function BoardCreateColumn() {
  const {
    columnForm,
    boardModal,
    isSending,
    userRole,
  } = useAppSelector((state) => state.board);
  const dispatch = useAppDispatch();

  const hasPermission = userRole === 1 || userRole === 2;

  const handleShow = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!hasPermission) return;

    const form: IColumnForm = {
      column_title: 'New column',
      wip_limit_on: true,
      wip_limit: 5,
    };
    dispatch({ type: 'COLUMN_FORM_SHOW', columnForm: form });
  };

  const handleClose = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    dispatch({ type: 'COLUMN_FORM_CLOSE' });
  };

  const handleInputTitle = (e: FormEvent<HTMLInputElement>) => {
    e.preventDefault();
    const value = (e.target as HTMLInputElement).value;
    dispatch({ type: 'COLUMN_FORM_INPUT', name: 'column_title', value });
  };

  const handleInputWIP = (e: FormEvent<HTMLInputElement>) => {
    e.preventDefault();
    const value = +(e.target as HTMLInputElement).value;
    dispatch({ type: 'COLUMN_FORM_INPUT', name: 'wip_limit', value });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const wsCommand = BoardCommands.CREATE_COLUMN;
    const wsParams = { ...columnForm };
    dispatch({ type: 'START_WS_COMMAND', wsCommand, wsParams });
  };

  const handleToggleWIP = (e: FormEvent<HTMLInputElement>) => {
    const checked: boolean = (e.target as HTMLInputElement).checked;
    const name = 'wip_limit_on';

    if (checked) {
      dispatch({ type: 'COLUMN_FORM_INPUT', name, value: true });
    } else {
      dispatch({ type: 'COLUMN_FORM_INPUT', name, value: false });
    }
  };

  const formOn = (
    !!columnForm && !columnForm.column_id &&
    typeof columnForm.column_title === 'string' &&
    typeof columnForm.wip_limit === 'number' &&
    typeof columnForm.wip_limit_on === 'boolean'
  );

  const buttonsDisabled = !hasPermission || isSending || !!boardModal;

  const rootClass = 'BoardCreateColumn';

  return (
    <div className={`${rootClass}${formOn ? ' is-on' : ''}`}>
      {formOn ? (
        <form
          className={`${rootClass}-form`}
          onSubmit={!isSending ? handleSubmit : undefined}
        >
          <Input
            className={`${rootClass}-form-input ${rootClass}-form-input--title`}
            type='text'
            name='column_title'
            value={columnForm?.column_title}
            disabled={buttonsDisabled}
            minLength={1}
            maxLength={80}
            onChange={handleInputTitle}
            autoFocus
            required
          />
          <div className='CloseIcon-container'>
            <CloseIcon
              type='button'
              onClick={handleClose}
              disabled={isSending || !!boardModal}
              title='Close'
            />
          </div>
          <SliderCheckbox
            className={`${rootClass}-form-input ${rootClass}-form-input--wipLimitOn`}
            label='Limit tasks?'
            type='checkbox'
            name='wip_limit_on'
            checked={columnForm?.wip_limit_on}
            onChange={handleToggleWIP}
            disabled={buttonsDisabled}
          />
          <Input
            className={`${rootClass}-form-input ${rootClass}-form-input--wipLimit`}
            label='Task limit'
            type='number'
            name='wip_limit'
            min={0}
            value={columnForm?.wip_limit}
            onChange={handleInputWIP}
            disabled={buttonsDisabled || !columnForm?.wip_limit_on}
          />
          <div className={`${rootClass}-form-icons`}>
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
      ) : (
        <PlusIcon
          className='BoardCreateColumn-button'
          type='button'
          title='Add a new column'
          onClick={handleShow}
          disabled={buttonsDisabled}
        />
      )}
    </div>
  );
}