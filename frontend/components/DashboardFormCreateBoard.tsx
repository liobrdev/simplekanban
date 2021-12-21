import { FormEvent, MouseEvent, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { enableBodyScroll, disableBodyScroll } from 'body-scroll-lock';

import { useAppDispatch, useAppSelector } from '@/hooks';
import { checkListBoard } from '@/types';
import { parseErrorResponse, request } from '@/utils';

import { CloseIcon, Input, PlusIcon } from './';


const initialForm = { board_title: '' };
const initialError: ReturnType<typeof parseErrorResponse> = {};

export default function DashboardFormCreateBoard() {
  const {
    formOnCreateBoard,
    isCreating,
    isRetrieving,
  } = useAppSelector((state) => state.dashboard);
  const dispatch = useAppDispatch();

  const [form, setForm] = useState({ ...initialForm });
  const [errorCreate, setError] = useState({ ...initialError });

  const router = useRouter();
  const thisComponent = useRef<HTMLDivElement>(null);

  const handleShow = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (thisComponent.current) disableBodyScroll(thisComponent.current);
    dispatch({ type: 'DASHBOARD_FORM_SHOW' });
  };

  const handleClose = (e: MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
    e.preventDefault();
    if (thisComponent.current) enableBodyScroll(thisComponent.current);
    setForm({ ...initialForm });
    setError({ ...initialError });
    dispatch({ type: 'DASHBOARD_FORM_CLOSE' });
  };

  const handleInput = (e: FormEvent<HTMLInputElement>) => {
    e.preventDefault();
    const value = (e.target as HTMLInputElement).value;
    setForm({ board_title: value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch({ type: 'START_CREATE_BOARD' });
    setError({});

    try {
      const token = localStorage.getItem('simple_kanban_token');
      const board = await request
        .post('/boards/')
        .set({ 'Authorization': `Token ${token}` })
        .send({ ...form })
        .then((res) => checkListBoard(res.body, res));
      setForm({ ...initialForm });
      if (thisComponent.current) enableBodyScroll(thisComponent.current);
      dispatch({ type: 'SUCCESS_CREATE_BOARD', board });
      router.push(`/board/${board.board.board_slug}`);
    } catch (err: any) {
      dispatch({ type: 'STOP_CREATE_BOARD' });
      // Possibly report to api in the future, for now just console.error
      // reportErrorToAPI(err);
      console.error(err);
      const res = err?.response;

      if (res?.unauthorized || res?.forbidden) {
        localStorage.removeItem('simple_kanban_token');
        if (thisComponent.current) enableBodyScroll(thisComponent.current);
        dispatch({ type: 'START_LOGOUT_USER' });
      }

      setError(parseErrorResponse(res?.body, Object.keys(form)));
    }
  };

  const canSubmit =
    formOnCreateBoard && !!form.board_title && !isCreating && !isRetrieving;

  const rootClass = 'DashboardFormCreateBoard';

  const formCreateBoard = (
    <form
      className={rootClass + '-form'}
      onSubmit={canSubmit ? handleSubmit : undefined}
    >
      <div className='CloseIcon-container'>
        <CloseIcon
          onClick={handleClose}
          disabled={isCreating}
          type='button'  
        />
      </div>
      <Input
        className={rootClass + '-form-input'}
        label='New project title'
        type='text'
        name='board_title'
        value={form.board_title}
        minLength={1}
        maxLength={255}
        disabled={isCreating}
        onChange={handleInput}
        autoFocus
        required
      />
      {errorCreate?.board_title?.map(e => (
        <p key={e.id} className={rootClass + '-form-error'}>{e.msg}</p>
      ))}
      {errorCreate?.nonField?.map(e => (
        <p key={e.id} className={rootClass + '-form-error'}>{e.msg}</p>
      ))}
      {errorCreate?.detail?.map(e => (
        <p key={e.id} className={rootClass + '-form-error'}>{e.msg}</p>
      ))}
      <button
        className={`${rootClass}-form-button ${rootClass}-form-button--submit`}
        type='submit'
        disabled={!canSubmit}
      >
        {isCreating ? 'Creating board...' : 'Save'}
      </button>
    </form>
  );

  return (
    <>
      <div
        className={`${rootClass}${formOnCreateBoard ? ' is-on' : ''}`}
        ref={thisComponent}
      >
        {formOnCreateBoard && (
          <>
            <div className={rootClass + '-overlay'} onClick={handleClose} />
            {formCreateBoard}
          </>
        )}
        {!formOnCreateBoard && <PlusIcon onClick={handleShow} type='button' />}
      </div>
    </>
  );
}