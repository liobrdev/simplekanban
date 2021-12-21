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

export default function RegisterForm({ initial_email }: Props) {
  const [form, setForm] = useState({
    name: '',
    email: initial_email,
    password: '',
    password_2: '',
  });
  const [error, setError] = useState({ ...initialError });
  const dispatch = useAppDispatch();

  const handleInput = () => (e: FormEvent<HTMLInputElement>) => {
    const name = (e.target as HTMLInputElement).name;
    const value = (e.target as HTMLInputElement).value;
    setForm((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch({ type: 'START_REGISTER_USER' });
    setError({});

    try {
      const { token, data } = await request
        .post('/auth/register/')
        .send({ ...form })
        .then((res) => {
          const token: string = checkToken(res.body?.token, res);
          const data: IUser = checkUser(res.body?.user, res);
          return { token, data };
        });
      localStorage.setItem('simple_kanban_token', token);
      dispatch({ type: 'SUCCESS_REGISTER_USER', data });
      mutate('/users/');
    } catch (err: any) {
      localStorage.removeItem('simple_kanban_token');
      dispatch({ type: 'STOP_REGISTER_USER' });
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
    form.name && form.email && form.password && form.password_2
  );

  return (
    <form
      className='RegisterForm'
      id='formRegister'
      onSubmit={canSubmit ? handleSubmit : undefined}
    >
      <Input
        className='RegisterForm-input'
        label='Name'
        name='name'
        type='text'
        disabled={isRegistering}
        minLength={1}
        maxLength={50}
        onChange={handleInput()}
        required
        autoFocus
      />
      {error?.name?.map(
        e => <p key={e.id} className='RegisterForm-error'>{e.msg}</p>
      )}
      <Input
        className='RegisterForm-input'
        label='Email'
        name='email'
        value={form.email}
        type='text'
        disabled={isRegistering}
        minLength={1}
        maxLength={50}
        onChange={handleInput()}
        required
      />
      {error?.email?.map(
        e => <p key={e.id} className='RegisterForm-error'>{e.msg}</p>
      )}
      <Input
        className='RegisterForm-input'
        label='Choose password'
        name='password'
        type='password'
        disabled={isRegistering}
        onChange={handleInput()}
        required
      />
      {error?.password?.map(
        e => <p key={e.id} className='RegisterForm-error'>{e.msg}</p>
      )}
      <Input
        className='RegisterForm-input'
        label='Enter password again'
        name='password_2'
        type='password'
        disabled={isRegistering || (!form.password && !form.password_2)}
        onChange={handleInput()}
        required
      />
      {error?.password_2?.map(
        e => <p key={e.id} className='RegisterForm-error'>{e.msg}</p>
      )}
      {error?.nonField?.map(
        e => <p key={e.id} className='RegisterForm-error'>{e.msg}</p>
      )}
      {error?.detail?.map(
        e => <p key={e.id} className='RegisterForm-error'>{e.msg}</p>
      )}
      <button
        className='RegisterForm-button'
        type='submit'
        disabled={!canSubmit}
      >
        {isRegistering ? 'Signing up...' : 'Sign up'}
      </button>
    </form>
  );
}