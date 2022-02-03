import { FormEvent, useState } from 'react';

import { mutate } from 'swr';

import { useAppDispatch, useAppSelector } from '@/hooks';
import { checkToken, checkUser, IUser } from '@/types';
import { parseErrorResponse, request } from '@/utils';

import { Input } from './';


interface Props {
  initial_email: string;
}

const initialError: ReturnType<typeof parseErrorResponse> = {};

export default function LoginForm({ initial_email }: Props) {
  const [form, setForm] = useState({ email: initial_email, password: '' });
  const [error, setError] = useState({ ...initialError });
  const dispatch = useAppDispatch();

  const handleInput = () => (e: FormEvent<HTMLInputElement>) => {
    const name = (e.target as HTMLInputElement).name;
    const value = (e.target as HTMLInputElement).value;
    setForm((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch({ type: 'START_LOGIN_USER' });

    try {
      const { token, data } = await request
        .post('/auth/login/')
        .send({ ...form })
        .then((res) => {
          const token: string = checkToken(res.body?.token, res);
          const data: IUser = checkUser(res.body?.user, res);
          return { token, data };
        });
      localStorage.setItem('simplekanban_token', token);
      dispatch({ type: 'SUCCESS_LOGIN_USER', data });
      mutate('/users/');
    } catch (err: any) {
      localStorage.removeItem('simplekanban_token');
      dispatch({ type: 'STOP_LOGIN_USER' });
      // Possibly report to api in the future, for now just console.error
      // reportErrorToAPI(err);
      console.error(err);
      setError(parseErrorResponse(err?.response?.body, Object.keys(form)));
    }
  };

  const {
    isLoggingIn,
    isLoggingOut,
    isRegistering,
  } = useAppSelector((state) => state.user);

  const canSubmit = !!(
    !isLoggingIn &&
    !isLoggingOut &&
    !isRegistering &&
    form.email && form.password
  );

  return (
    <form
      className='LoginForm'
      id='formLogin'
      onSubmit={canSubmit ? handleSubmit : undefined}
    >
      <Input
        className='LoginForm-input'
        label='Email'
        name='email'
        value={form.email}
        type='text'
        disabled={isLoggingIn}
        minLength={1}
        maxLength={50}
        onChange={handleInput()}
        required
        autoFocus
      />
      {error?.email?.map(
        e => <p key={e.id} className='LoginForm-error'>{e.msg}</p>
      )}
      <Input
        className='LoginForm-input'
        label='Password'
        name='password'
        type='password'
        disabled={isLoggingIn}
        onChange={handleInput()}
        required
      />
      {error?.password?.map(
        e => <p key={e.id} className='LoginForm-error'>{e.msg}</p>
      )}
      {error?.nonField?.map(
        e => <p key={e.id} className='LoginForm-error'>{e.msg}</p>
      )}
      {error?.detail?.map(
        e => <p key={e.id} className='LoginForm-error'>{e.msg}</p>
      )}
      <button
        className='LoginForm-button'
        type='submit'
        disabled={!canSubmit}
      >
        {isLoggingIn ? 'Logging in...' : 'Log in'}
      </button>
    </form>
  );
}