import { FormEvent, useState } from 'react';

import { parseErrorResponse, request } from '@/utils';

import { Input } from './';


interface Props {
  token: string;
}

const initialError: ReturnType<typeof parseErrorResponse> = {};

const initialForm = {
  email: '',
  password: '',
  password_2: '',
  token: '',
}

export default function ResetPasswordForm({ token }: Props) {
  const [form, setForm] = useState({ ...initialForm });
  const [didReset, setDidReset] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState({ ...initialError });

  const handleInput = () => (e: FormEvent<HTMLInputElement>) => {
    const name = (e.target as HTMLInputElement).name;
    const value = (e.target as HTMLInputElement).value;
    setForm((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError({});
    setIsValidating(true);

    try {
      const response = await request
        .post('/auth/reset_password/')
        .send({ ...form, token });

      if (response.status === 204) {
        setDidReset(true);
        setForm({ ...initialForm });
      }
    } catch (err: any) {
      // Possibly report to api in the future, for now just console.error
      // reportErrorToAPI(error);
      setDidReset(false);
      console.error(err);
      setError(parseErrorResponse(err?.response?.body, Object.keys(form)));
    } finally {
      setIsValidating(false);
    }
  };

  const canSubmit = !!(
    !isValidating &&
    !didReset &&
    form.email && form.password && form.password_2
  );

  return (
    <form
      className='ResetPasswordForm'
      id='formResetPassword'
      onSubmit={canSubmit ? handleSubmit : undefined}
    >
      {!didReset && (
        <>
          <Input
            className='ResetPasswordForm-input'
            label='Enter your account email'
            name='email'
            type='text'
            disabled={isValidating || didReset}
            minLength={1}
            maxLength={50}
            onChange={handleInput()}
            required
            autoFocus
          />
          {error?.email?.map(
            e => <p key={e.id} className='ResetPasswordForm-error'>{e.msg}</p>
          )}
          <Input
            className='ResetPasswordForm-input'
            label='Set new password'
            name='password'
            type='password'
            disabled={isValidating || didReset}
            onChange={handleInput()}
            required
          />
          {error?.password?.map(
            e => <p key={e.id} className='ResetPasswordForm-error'>{e.msg}</p>
          )}
          <Input
            className='ResetPasswordForm-input'
            label='Enter new password again'
            name='password_2'
            type='password'
            disabled={
              isValidating || didReset || (!form.password && !form.password_2)
            }
            onChange={handleInput()}
            required
          />
          {error?.password_2?.map(
            e => <p key={e.id} className='ResetPasswordForm-error'>{e.msg}</p>
          )}
          {error?.nonField?.map(
            e => <p key={e.id} className='ResetPasswordForm-error'>{e.msg}</p>
          )}
          {error?.detail?.map(
            e => <p key={e.id} className='ResetPasswordForm-error'>{e.msg}</p>
          )}
          <button
            className='ResetPasswordForm-button'
            type='submit'
            disabled={!canSubmit}
          >
            {isValidating ? 'Submitting...' : 'Submit'}
          </button>
        </>
      )}
      {didReset && (
        <>
          <p className='ResetPasswordForm-message'>
            Account updated!
          </p>
          {error?.nonField?.map(
            e => <p key={e.id} className='ResetPasswordForm-error'>{e.msg}</p>
          )}
          {error?.detail?.map(
            e => <p key={e.id} className='ResetPasswordForm-error'>{e.msg}</p>
          )}
        </>
      )}
    </form>
  );
}