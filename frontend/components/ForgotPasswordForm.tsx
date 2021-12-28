import { FormEvent, useState } from 'react';

import { parseErrorResponse, request } from '@/utils';

import { Input } from './';


const initialError: ReturnType<typeof parseErrorResponse> = {};

export default function ForgotPasswordForm() {
  const [form, setForm] = useState({ email: '' });
  const [isRequesting, setIsRequesting] = useState(false);
  const [didSend, setDidSend] = useState(false);
  const [error, setError] = useState({ ...initialError });

  const handleInput = () => (e: FormEvent<HTMLInputElement>) => {
    const name = (e.target as HTMLInputElement).name;
    const value = (e.target as HTMLInputElement).value;
    setForm((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError({});
    setIsRequesting(true);

    try {
      const response =
        await request.post('/auth/forgot_password/').send({ ...form });
      if (response.status === 204) {
        setDidSend(true);
        setForm({ email: '' });
      }
    } catch (err: any) {
      // Possibly report to api in the future, for now just console.error
      // reportErrorToAPI(error);
      setDidSend(false);
      console.error(err);
      setError(parseErrorResponse(err?.response?.body, Object.keys(form)));
    } finally {
      setIsRequesting(false);
    }
  };

  const canSubmit = !isRequesting && !!form.email && !didSend;

  return (
    <form
      className='ForgotPasswordForm'
      id='formForgotPassword'
      onSubmit={canSubmit ? handleSubmit : undefined}
    >
      {!didSend && (
        <>
          <Input
            className='ForgotPasswordForm-input'
            label='Enter your account email'
            name='email'
            type='text'
            disabled={isRequesting || didSend}
            minLength={1}
            maxLength={50}
            onChange={handleInput()}
            required
            autoFocus
          />
          {error?.email?.map(
            e => <p key={e.id} className='ForgotPasswordForm-error'>{e.msg}</p>
          )}
          {error?.nonField?.map(
            e => <p key={e.id} className='ForgotPasswordForm-error'>{e.msg}</p>
          )}
          {error?.detail?.map(
            e => <p key={e.id} className='ForgotPasswordForm-error'>{e.msg}</p>
          )}
          <button
            className='ForgotPasswordForm-button'
            type='submit'
            disabled={!canSubmit}
          >
            {isRequesting ? 'Sending...' : 'Send'}
          </button>
        </>
      )}
      {didSend && (
        <>
          <p className='ForgotPasswordForm-message'>
            Please check your email to reset your password.
          </p>
          {error?.nonField?.map(
            e => <p key={e.id} className='ForgotPasswordForm-error'>{e.msg}</p>
          )}
          {error?.detail?.map(
            e => <p key={e.id} className='ForgotPasswordForm-error'>{e.msg}</p>
          )}
        </>
      )}
    </form>
  );
}