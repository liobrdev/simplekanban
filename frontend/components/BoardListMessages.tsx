import React, { Component } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { AppDispatch, AppState, IMessage } from '@/types';

import { BoardMessage } from './';


const dateOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

class BoardListMessages extends Component<Props> {
  checkMsgInfo() {
    if (!this.props.board) return;

    this.props.board.messages.forEach((msg, index, array) => {
      // Assume that 'dateString' and/or 'hideInfo'
      // will not be appended to this message
      let willAppend = false;

      const previousMsg = array[index - 1]; // This could be undefined
      const previousDate = !!previousMsg && new Date(previousMsg.created_at);
      const currentDate = new Date(msg.created_at);

      const previousDateString = !!previousMsg && new Intl.DateTimeFormat(
        'default',
        dateOptions,
      ).format(previousDate);

      const currentDateString = new Intl.DateTimeFormat(
        'default',
        dateOptions,
      ).format(currentDate);

      // Show the date above groups of messages sent on the same day
      if (previousDateString !== currentDateString) {
        msg.dateString = currentDateString;
        willAppend = true;
      }

      // If the same user sent back-to-back messages less than 2 minutes
      // apart, don't show the redundant sender info
      if (
        !!previousMsg &&
        previousMsg.sender.user_slug === msg.sender.user_slug &&
        (currentDate.getTime() - previousDate.getTime()) / 1000 < 60 * 2
      ) {
        msg.hideInfo = true;
        willAppend = true;
      }

      if (willAppend) this.props.msgInfoAppend(msg);
    });
  }

  componentDidMount() {
    this.checkMsgInfo();
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.board && prevProps.board && (
      this.props.board.messages.length !== prevProps.board.messages.length
    )) {
      this.checkMsgInfo();
    }
  }

  render() {
    const { board, isHidden } = this.props;

    const hasMessages =
      Array.isArray(board?.messages) && !!board?.messages.length;    

    const list = hasMessages ? (
      <ul className='BoardListMessages-list'>
        {!!board && board.messages.map(msg => (
          <li className='BoardListMessages-list-item' key={msg.msg_id}>
            {!!msg.dateString && (
              <div className='BoardListMessages-list-item-date'>
                <span>&nbsp;&nbsp;{msg.dateString}&nbsp;&nbsp;</span>
              </div>
            )}
            <BoardMessage message={msg} />
          </li>
        ))}
      </ul>
    ) : null;

    const empty = !hasMessages ? (
      <p className='BoardListMessages-empty-message'>
        There are no messages in this chat yet.
      </p>
    ) : null;

    return (
      <div className={`BoardListMessages${
        isHidden ? ' is-hidden' : ''
      }${
        !hasMessages ? ' is-empty' : ''
      }`}>
        {list}
        {empty}
      </div>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  board: state.board.board,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  msgInfoAppend: (msg: IMessage) => {
    dispatch({ type: 'MSG_INFO_APPEND', msg });
  },
});

const connector = connect(mapStateToProps, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

interface Props extends PropsFromRedux {
  isHidden: boolean;
}

export default React.memo(connector(BoardListMessages));