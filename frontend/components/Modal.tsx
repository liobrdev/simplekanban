import { Component, MouseEvent, createRef, RefObject } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock';

import { AppDispatch, IAction, IModal } from '@/types';


class Modal extends Component<Props> {
  private component: RefObject<HTMLDivElement>;

  constructor(props: Props) {
    super(props);
    this.component = createRef();
    this.handleClose = this.handleClose.bind(this);
    this.handleLeftButton = this.handleLeftButton.bind(this);
    this.handleRightButton = this.handleRightButton.bind(this);
  }

  handleLeftButton(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const { dispatch, modal: { page, leftButton } } = this.props;
    if (leftButton) {
      const { action } = leftButton;
      dispatch(action);
    } else {
      dispatch({ type: `${page.toUpperCase()}_MODAL_CLOSE` });
    }
  }

  handleRightButton(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const { dispatch, modal: { rightButton } } = this.props;
    if (rightButton) {
      const { action } = rightButton;
      dispatch(action);
    }
  }

  handleClose(e: MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    const { dispatch, modal: { page } } = this.props;
    dispatch({ type: `${page.toUpperCase()}_MODAL_CLOSE` });
  }

  componentDidMount() {
    if (this.component.current) disableBodyScroll(this.component.current);
  }

  componentWillUnmount() {
    if (this.component.current) enableBodyScroll(this.component.current);
  }

  render() {
    const { page, message, leftButton, rightButton } = this.props.modal;

    return (
      <div className={`Modal Modal--${page}`} ref={this.component}>
        <div className='Modal-overlay' onClick={this.handleClose} />
        <div className='Modal-modal'>
          <div className='Modal-modal-message'>
            {message}
          </div>
          <div className='Modal-modal-buttons'>
            <button
              className='Modal-modal-button Modal-button--left'
              type='button'
              onClick={this.handleLeftButton}
              autoFocus
            >
              {leftButton?.text || 'Close'}
            </button>
            {!!rightButton && (
              <button
                className='Modal-modal-button Modal-button--right'
                type='button'
                onClick={this.handleRightButton}
              >
                {rightButton.text}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  dispatch: (action: IAction) => {
    dispatch(action);
  }
});

const connector = connect(null, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

interface Props extends PropsFromRedux {
  modal: IModal;
}

export default connector(Modal);