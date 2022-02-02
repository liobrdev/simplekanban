import { Component, FormEvent, MouseEvent, createRef, RefObject } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { mutate } from 'swr';
import { enableBodyScroll, disableBodyScroll } from 'body-scroll-lock';

import { AppDispatch, AppState } from '@/types';
import { parseErrorResponse, request } from '@/utils';

import { Input, CloseIcon } from './';


class AccountFormDeleteUser extends Component<Props, State> {
  private component: RefObject<HTMLDivElement>;

  constructor(props: Props) {
    super(props);
    this.component = createRef();
    this.state = {
      form: { email: '', current_password: '' },
      error: {},
    };
    this.handleClose = this.handleClose.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleClose(e: MouseEvent<HTMLButtonElement | HTMLDivElement>) {
    e.preventDefault();
    this.props.accountFormDeleteClose();
  }

  handleInput(e: FormEvent<HTMLInputElement>) {
    e.preventDefault();
    let name = (e.target as HTMLInputElement).name;
    
    if (name.includes('email')) name = 'email';
    else if (name.includes('current_password')) name = 'current_password';
    else return;

    const value = (e.target as HTMLInputElement).value;
    this.setState({ form: { ...this.state.form, [name]: value } });
  };

  async handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    this.props.startDeleteUser();
    this.setState({ error: {} });
    const { form } = this.state;

    try {
      const token = localStorage.getItem('simplepasswords_token');
      await request
        .delete(`/users/${this.props.user?.user_slug}/`)
        .set({ 'Authorization': `Token ${token}` })
        .send({ ...form });
      this.setState({ form: { email: '', current_password: '' } });
      localStorage.removeItem('simplepasswords_token');
      if (this.component.current) enableBodyScroll(this.component.current);
      this.props.successDeleteUser();
      mutate('/users/');
    } catch (err: any) {
      this.props.stopDeleteUser();
      // Possibly report to api in the future, for now just console.error
      // reportErrorToAPI(err);
      console.error(err);
      err = err?.response;

      if (err?.unauthorized || err?.forbidden || err?.notFound) {
        localStorage.removeItem('simplepasswords_token');
        if (this.component.current) enableBodyScroll(this.component.current);
        this.props.startLogoutUser();
      }
      const error = parseErrorResponse(err?.body, Object.keys(form));
      this.setState({ error });
    } finally {
      (document.activeElement as HTMLElement).blur();
    }
  };

  componentDidMount() {
    if (this.component.current) disableBodyScroll(this.component.current);
  }

  componentWillUnmount() {
    if (this.component.current) enableBodyScroll(this.component.current);
  }

  render() {
    const { isDeleting, user } = this.props;
    const { form, error } = this.state;

    const canSubmit = !!(
      !isDeleting &&
      form.email && form.email === user?.email &&
      form.current_password
    );

    const formDeleteUser = (
      <form
        className='AccountFormDeleteUser-form'
        id='formDeleteUser'
        onSubmit={canSubmit ? this.handleSubmit : undefined}
      >
        <div className='CloseIcon-container'>
          <CloseIcon
            type='button'
            onClick={this.handleClose}
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
          onChange={this.handleInput}
          autoFocus
          required
        />
        {error?.email?.map(
          e => <p key={e.id} className='AccountFormDeleteUser-form-error'>{e.msg}</p>
        )}
        <Input
          className='AccountFormDeleteUser-form-input'
          label='Master password'
          type='password'
          name='current_password__deleteUser'
          value={form.current_password}
          disabled={isDeleting}
          onChange={this.handleInput}
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

    return (
      <div className='AccountFormDeleteUser' ref={this.component}>
        <div
          className='AccountFormDeleteUser-overlay'
          onClick={this.handleClose}
        />
        {formDeleteUser}
      </div>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  isDeleting: state.user.isDeleting,
  user: state.user.user,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  accountFormDeleteClose: () => {
    dispatch({ type: 'ACCOUNT_FORM_DELETE_CLOSE' });
  },
  startDeleteUser: () => {
    dispatch({ type: 'START_DELETE_USER' });
  },
  stopDeleteUser: () => {
    dispatch({ type: 'STOP_DELETE_USER' });
  },
  successDeleteUser: () => {
    dispatch({ type: 'SUCCESS_DELETE_USER' });
  },
  startLogoutUser: () => {
    dispatch({ type: 'START_LOGOUT_USER' });
  },
});

const connector = connect(mapStateToProps, mapDispatchToProps);

type Props = ConnectedProps<typeof connector>;

interface IForm {
  email: string;
  current_password: string;
}

interface State {
  form: IForm;
  error: ReturnType<typeof parseErrorResponse>;
}

export default connector(AccountFormDeleteUser);