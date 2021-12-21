import React, { Component, createRef, MouseEvent, RefObject } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { enableBodyScroll, disableBodyScroll } from 'body-scroll-lock';
import { mutate } from 'swr';

import { AppDispatch, AppState } from '@/types';
import { request } from '@/utils';


class LogoutUser extends Component<Props, State> {
  private modal: RefObject<HTMLDivElement>;
  private events: string[];
  private warnTimeout?: ReturnType<typeof setTimeout>;
  private logoutTimeout?: ReturnType<typeof setTimeout>;

  constructor(props: Props) {
    super(props);
    this.modal = createRef();
    this.state = { showWarning: false };
    this.events = ['load', 'mousedown', 'click', 'scroll', 'keypress'];
    this.warnTimeout = undefined;
    this.logoutTimeout = undefined;
    this.resetTimeouts = this.resetTimeouts.bind(this);
    this.closeWarning = this.closeWarning.bind(this);
  }

  setWarnTimeout() {
    // Show warning after 29m30s of inactivity
    this.warnTimeout = setTimeout(() => {
      this.setState({ showWarning: true }, () => {
        if (this.modal.current) disableBodyScroll(this.modal.current);
        this.setLogoutTimeout();
      });
    }, (60 * 30 - 30) * 1000);
  }
  
  setLogoutTimeout() {
    // Logout user after another 30s of inactivity
    this.logoutTimeout = setTimeout(() => {
      this.props.startLogoutUser();
    }, 30 * 1000);
  }

  clearTimeouts() {
    if (this.warnTimeout) clearTimeout(this.warnTimeout);
    if (this.logoutTimeout) clearTimeout(this.logoutTimeout);
  }

  resetTimeouts() {
    // Clear any active timeouts,
    // then restart the 29m30s warning countdown
    this.clearTimeouts();
    this.setWarnTimeout();
  }

  closeWarning(e: MouseEvent<HTMLButtonElement | HTMLDivElement>) {
    e.preventDefault();
    if (this.modal.current) enableBodyScroll(this.modal.current);
    this.setState({ showWarning: false }, this.resetTimeouts);
  }

  componentDidMount() {
    this.events.forEach((event) => {
      window.addEventListener(event, this.resetTimeouts);
    });
    this.setWarnTimeout();
  }

  async componentDidUpdate(prevProps: Props) {
    if (this.props.isLoggingOut && !prevProps.isLoggingOut) {
      try {
        const token = localStorage.getItem('simple_kanban_token');
        await request
          .post('/auth/logout/')
          .set({ 'Authorization': `Token ${token}` })
          .send({})
      } catch (error) {
        // Possibly report to api in the future, for now just console.error
        // reportErrorToAPI(error);
        console.error(error);
      } finally {
        localStorage.removeItem('simple_kanban_token');
        this.props.successLogoutUser();
        mutate('/users/');
      }
    }
  }

  componentWillUnmount() {
    if (this.modal.current) enableBodyScroll(this.modal.current);
    this.events.forEach((event) => {
      window.removeEventListener(event, this.resetTimeouts);
    });
    this.clearTimeouts();
  }

  render() {
    return (
      <>
        {this.state.showWarning && (
          <aside className='LogoutUser-warning'>
            <div
              className='LogoutUser-warning-overlay'
              onClick={this.closeWarning}
            />
            <div className='LogoutUser-warning-modal' ref={this.modal}>
              <p className='LogoutUser-warning-modal-message'>
                You will be logged out automatically after
                30 more seconds of inactivity.
                Click &apos;Cancel&apos; to stay logged in.
              </p>
              <div className='LogoutUser-warning-modal-buttons'>
                <button
                  className='LogoutUser-warning-modal-button'
                  type='button'
                  onClick={this.props.startLogoutUser}
                >
                  Logout now
                </button>
                <button
                  className='LogoutUser-warning-modal-button'
                  type='button'
                  autoFocus
                  onClick={this.closeWarning}
                >
                  Cancel
                </button>
              </div>
            </div>
          </aside>
        )}
      </>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  isLoggingOut: state.user.isLoggingOut,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  startLogoutUser: () => {
    dispatch({ type: 'START_LOGOUT_USER' });
  },
  successLogoutUser: () => {
    dispatch({ type: 'SUCCESS_LOGOUT_USER' });
  },
});

const connector = connect(mapStateToProps, mapDispatchToProps);

type Props = ConnectedProps<typeof connector>;

interface State {
  showWarning: boolean;
}

export default connector(LogoutUser);