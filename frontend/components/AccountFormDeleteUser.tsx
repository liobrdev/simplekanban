import { FormEvent, MouseEvent, useRef, useState } from 'react';
import { mutate } from 'swr';
import { enableBodyScroll, disableBodyScroll } from 'body-scroll-lock';

import { useAppDispatch, useAppSelector } from '@/hooks';
import { parseErrorResponse, request } from '@/utils';

import { Input, CloseIcon } from './';


const initialForm = { email: '', current_password: '' };
const initialError: ReturnType<typeof parseErrorResponse> = {};

export default function AccountFormUpdateUser() {
  const { formOnDeleteUser } = useAppSelector((state) => state.account);
  const {
    isLoggingIn,
    isLoggingOut,
    isRegistering,
    isUpdating,
    isDeleting,
    user,
  } = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();

  const [form, setForm] = useState({ ...initialForm });
  const [error, setError] = useState({ ...initialError });

  const thisComponent = useRef<HTMLDivElement>(null);

  const handleShow = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setForm({ ...initialForm });
    setError({});
    if (thisComponent.current) disableBodyScroll(thisComponent.current);
    dispatch({ type: 'ACCOUNT_DELETE_FORM_SHOW' });
  }

  const handleClose = (e: MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
    e.preventDefault();
    setForm({ ...initialForm });
    setError({});
    if (thisComponent.current) enableBodyScroll(thisComponent.current);
    dispatch({ type: 'ACCOUNT_DELETE_FORM_CLOSE' });
  }

  const handleInput = () => (e: FormEvent<HTMLInputElement>) => {
    e.preventDefault();
    let name = (e.target as HTMLInputElement).name;
    
    if (name.includes('email')) name = 'email';
    else if (name.includes('current_password')) name = 'current_password';
    else return;

    const value = (e.target as HTMLInputElement).value;
    setForm((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch({ type: 'START_DELETE_USER' });
    setError({});

    try {
      const token = localStorage.getItem('simple_kanban_token');
      await request
        .delete(`/users/${user?.user_slug}/`)
        .set({ 'Authorization': `Token ${token}` })
        .send({ ...form });
      setForm({ ...initialForm });
      localStorage.removeItem('simple_kanban_token');
      if (thisComponent.current) enableBodyScroll(thisComponent.current);
      dispatch({ type: 'SUCCESS_DELETE_USER' });
      mutate('/users/');
    } catch (err: any) {
      dispatch({ type: 'STOP_DELETE_USER' });
      // Possibly report to api in the future, for now just console.error
      // reportErrorToAPI(err);
      console.error(err);

      if (
        err?.response?.unauthorized ||
        err?.response?.forbidden ||
        err?.response?.notFound
      ) {
        localStorage.removeItem('simple_kanban_token');
        if (thisComponent.current) enableBodyScroll(thisComponent.current);
        dispatch({ type: 'START_LOGOUT_USER' });
      }

      setError(parseErrorResponse(err?.response?.body, Object.keys(form)));
    } finally {
      (document.activeElement as HTMLElement).blur();
    }
  };

  const canSubmit = !!(
    formOnDeleteUser &&
    !isLoggingIn &&
    !isLoggingOut &&
    !isRegistering &&
    !isUpdating &&
    !isDeleting &&
    form.email && form.email === user?.email &&
    form.current_password
  );

  const formDeleteUser = (
    <form
      className='AccountFormDeleteUser-form'
      id='formDeleteUser'
      onSubmit={canSubmit ? handleSubmit : undefined}
    >
      <div className='CloseIcon-container'>
        <CloseIcon
          type='button'
          onClick={handleClose}
          disabled={isDeleting}
        />
      </div>
      <div className='AccountFormDeleteUser-form-text'>
        To deactivate your account, please re-enter your email and password.
        You will be removed as a member from all projects.
        All projects for which you are the admin will be deleted.
      </div>
      <Input
        className='AccountFormDeleteUser-form-input'
        label='Email address'
        type='email'
        name='email__deleteUser'
        value={form.email}
        disabled={isDeleting}
        minLength={1}
        maxLength={50}
        onChange={handleInput()}
        autoFocus
        required
      />
      {error?.email?.map(
        e => <p key={e.id} className='AccountFormDeleteUser-form-error'>{e.msg}</p>
      )}
      <Input
        className='AccountFormDeleteUser-form-input'
        label='Password'
        type='password'
        name='current_password__deleteUser'
        value={form.current_password}
        disabled={isDeleting}
        maxLength={128}
        onChange={handleInput()}
        required
      />
      {error?.current_password?.map(
        e => <p key={e.id} className='AccountFormDeleteUser-form-error'>{e.msg}</p>
      )}
      {error?.nonField?.map(
        e => <p key={e.id} className='AccountFormDeleteUser-form-error'>{e.msg}</p>
      )}
      {error?.detail?.map(
        e => <p key={e.id} className='AccountFormDeleteUser-form-error'>{e.msg}</p>
      )}
      <button
        className='AccountFormDeleteUser-form-button'
        type='submit'
        disabled={!canSubmit}
      >
        {isDeleting ? 'Deleting account...' : 'Confirm delete'}
      </button>
    </form>
  );

  const buttonShowForm = (
    <button
      className='AccountButtonDeleteUser'
      type='button'
      disabled={formOnDeleteUser || isUpdating || isDeleting}
      onClick={handleShow}
    >
      Deactivate my account
    </button>
  );

  return (
    <div
      className={`AccountFormDeleteUser${formOnDeleteUser ? ' is-on' : ''}`}
      ref={thisComponent}
    >
      {formOnDeleteUser && (
        <>
          <div
            className='AccountFormDeleteUser-overlay'
            onClick={handleClose}
          />
          {formDeleteUser}
        </>
      )}
      {!formOnDeleteUser && buttonShowForm}
    </div>
  );
}