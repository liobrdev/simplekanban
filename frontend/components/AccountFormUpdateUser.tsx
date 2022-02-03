import { FormEvent, MouseEvent } from 'react';

import { useState } from 'react';
import { mutate } from 'swr';

import { useAppDispatch, useAppSelector } from '@/hooks';
import { checkUser, IModal, IUser, IUserForm } from '@/types';
import { parseErrorResponse, request } from '@/utils';

import { Input } from './';


interface Props {
  user: IUser;
}

export default function AccountFormUpdateUser({ user }: Props ) {
  const {
    isLoggingIn,
    isLoggingOut,
    isRegistering,
    isUpdating,
  } = useAppSelector((state) => state.user);
  const { formOnDeleteUser } = useAppSelector((state) => state.account);
  const dispatch = useAppDispatch();

  const initialForm: IUserForm = {
    name: user.name,
    email: user.email,
    password: '',
    password_2: '',
    current_password: '',
  };

  const initialError: ReturnType<typeof parseErrorResponse> = {};

  const [form, setForm] = useState({ ...initialForm });
  const [error, setError] = useState({ ...initialError });

  const handleInput = () => (e: FormEvent<HTMLInputElement>) => {
    e.preventDefault();
    const name: string = (e.target as HTMLInputElement).name;
    const value: string = (e.target as HTMLInputElement).value;
    setForm((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleReset = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setForm({ ...initialForm });
    setError({});
    window.scrollTo(0, 0);
    (document.activeElement as HTMLElement).blur();
  };

  const handleVerifyEmail = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    dispatch({ type: 'START_UPDATE_USER' });
    setError({});

    try {
      const token = localStorage.getItem('simplekanban_token');
      await request
        .get('/auth/verify_email/')
        .set({ 'Authorization': `Token ${token}` })
        .then((res) => {
          if (res.noContent) {
            const accountModal: IModal = {
              message: 'Please check your email to complete verification.',
              page: 'account',
            };
            dispatch({ type: 'ACCOUNT_MODAL_SHOW' , accountModal });
          }
        });
    } catch (err: any) {
      // Possibly report to api in the future, for now just console.error
      // reportErrorToAPI(err);
      console.error(err);

      if (err?.response?.unauthorized || err?.response?.forbidden) {
        localStorage.removeItem('simplekanban_token');
        dispatch({ type: 'START_LOGOUT_USER' });
      }

      setError({
        email: [
          { id: 'verifyFail', msg: 'Failed to send verification email.' },
        ],
      });
    } finally {
      dispatch({ type: 'STOP_UPDATE_USER' });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch({ type: 'START_UPDATE_USER' });
    setError({});

    try {
      const token = localStorage.getItem('simplekanban_token');
      const data = await request
        .patch(`/users/${user.user_slug}/`)
        .set({ 'Authorization': `Token ${token}` })
        .send({ ...form })
        .then((res) => checkUser(res.body, res));
      dispatch({ type: 'SUCCESS_UPDATE_USER', data });
      mutate('/users/');
      const { name, email } = data;
      setForm({ ...initialForm, name, email });
      window.scrollTo(0, 0);
      const accountModal: IModal = {
        message: 'Update successful!',
        page: 'account',
      };
      dispatch({ type: 'ACCOUNT_MODAL_SHOW' , accountModal });
    } catch (err: any) {
      dispatch({ type: 'STOP_UPDATE_USER' });
      // Possibly report to api in the future, for now just console.error
      // reportErrorToAPI(err);
      console.error(err);

      if (err?.response?.unauthorized || err?.response?.forbidden) {
        localStorage.removeItem('simplekanban_token');
        dispatch({ type: 'START_LOGOUT_USER' });
      }

      setError(parseErrorResponse(err?.response?.body, Object.keys(form)));
    } finally {
      (document.activeElement as HTMLElement).blur();
    }
  };

  const canSubmit = !!(
    !formOnDeleteUser &&
    !isLoggingIn &&
    !isLoggingOut &&
    !isRegistering &&
    !isUpdating &&
    form.name &&
    form.email &&
    form.current_password
  );

  const emailIsVerified = !!user.email_is_verified;

  const emailVerification = (
    <>
      <span
        className={
          'AccountFormUpdateUser-verified ' +
          'AccountFormUpdateUser-verified--email'
        }
      >
        {(emailIsVerified && form.email === user.email) && '(verified)'}
        {(!emailIsVerified || form.email !== user.email) && '(not verified)'}
      </span>
      {!emailIsVerified && form.email === user.email && (
        <>
          <br/>
          <button
            className={
              'AccountFormUpdateUser-verify ' +
              'AccountFormUpdateUser-verify--email'
            }
            type='button'
            disabled={isUpdating}
            onClick={handleVerifyEmail}
          >
            {isUpdating ? 'Sending...' : 'Verify email address'}
          </button>
        </>
      )}
    </>
  );

  return (
    <form
      className='AccountFormUpdateUser'
      id='formUpdateUser'
      onSubmit={canSubmit ? handleSubmit : undefined}
    >
      <Input
        className='AccountFormUpdateUser-input'
        label='Name'
        type='text'
        name='name'
        value={form.name}
        disabled={isUpdating || formOnDeleteUser}
        minLength={1}
        maxLength={50}
        onChange={handleInput()}
        required
        showAsterisk
      />
      {error?.name?.map(
        e => <p key={e.id} className='AccountFormUpdateUser-error'>{e.msg}</p>
      )}
      <br/>
      <Input
        className='AccountFormUpdateUser-input'
        label={<>Email address{emailVerification}</>}
        type='email'
        name='email'
        value={form.email}
        disabled={isUpdating || formOnDeleteUser}
        minLength={1}
        maxLength={50}
        onChange={handleInput()}
        required
        showAsterisk
      />
      {error?.email?.map(
        e => <p key={e.id} className='AccountFormUpdateUser-error'>{e.msg}</p>
      )}
      <br/>
      <Input
        className='AccountFormUpdateUser-input'
        label='Set new password'
        type='password'
        name='password'
        value={form.password}
        disabled={isUpdating || formOnDeleteUser}
        onChange={handleInput()}
      />
      {error?.password?.map(
        e => <p key={e.id} className='AccountFormUpdateUser-error'>{e.msg}</p>
      )}
      <br/>
      <Input
        className='AccountFormUpdateUser-input'
        type='password'
        label='Enter new password again'
        name='password_2'
        value={form.password_2}
        disabled={
          isUpdating ||
          (!form.password && !form.password_2) ||
          formOnDeleteUser
        }
        onChange={handleInput()}
        required={!!form.password}
        showAsterisk={!!form.password}
      />
      {error?.password_2?.map(
        e => <p key={e.id} className='AccountFormUpdateUser-error'>{e.msg}</p>
      )}
      <br/>
      <Input
        className='AccountFormUpdateUser-input'
        type='password'
        label='Current password'
        name='current_password'
        value={form.current_password}
        disabled={isUpdating || formOnDeleteUser}
        onChange={handleInput()}
        required
        showAsterisk
      />
      {error?.current_password?.map(
        e => <p key={e.id} className='AccountFormUpdateUser-error'>{e.msg}</p>
      )}
      <br/>
      {error?.nonField?.map(
        e => <p key={e.id} className='AccountFormUpdateUser-error'>{e.msg}</p>
      )}
      {error?.detail?.map(
        e => <p key={e.id} className='AccountFormUpdateUser-error'>{e.msg}</p>
      )}
      <br/>
      <p className='AccountFormUpdateUser-text'>
        <span>*</span>&nbsp;Required
      </p>
      <br/>
      <button
        className='AccountFormUpdateUser-button AccountFormUpdateUser-button--undo'
        type='button'
        disabled={isUpdating || formOnDeleteUser}
        onClick={handleReset}
      >
        Undo changes
      </button>
      <button
        className='AccountFormUpdateUser-button'
        type='submit'
        disabled={!canSubmit || isUpdating || formOnDeleteUser}
      >
        {isUpdating ? 'Saving changes...' : 'Save changes'}
      </button>
    </form>
  );
}