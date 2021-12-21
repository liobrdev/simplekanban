import React, { Component, MouseEvent } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { mutate } from 'swr';

import { debounce } from 'lodash';

import { AppDispatch, AppState } from '@/types';

import { BoardThumb, DashboardRetrieveBoards, LoadingView } from './';


class DashboardListBoards extends Component<Props> {
  constructor(props: Props) {
    super(props);
    this.handleClick = debounce(this.handleClick.bind(this), 500, {
      leading: true,
      trailing: false,
    });
  }

  handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    this.props.refreshBoards();
    mutate('/boards/');
  }

  render() {
    const { boards, errorRetrieve, isRetrieving } = this.props;
    const hasBoards = !!boards?.length && Array.isArray(boards);

    return (
      <div className={`DashboardListBoards${!hasBoards ? ' is-empty' : ''}`}>
        <DashboardRetrieveBoards />
        {isRetrieving ? <LoadingView className='LoadingView--dashboard' /> : (
          <>
            {!errorRetrieve && hasBoards && (
              <ul className='DashboardListBoards-list'>
                {boards.map((listBoard) => (
                  <li
                    className='DashboardListBoards-list-item'
                    key={listBoard.board.board_slug}
                  >
                    <BoardThumb { ...listBoard.board } />
                  </li>
                ))}
              </ul>
            )}
            {!errorRetrieve && !hasBoards && (
              <p className='DashboardListBoards-message'>
                You don&apos;t have any boards at the moment.
                Tap <span>+</span> to create one!
              </p>
            )}
            {!!errorRetrieve && (
              <div className='DashboardListBoards-error'>
                <p className='DashboardListBoards-error-message'>
                  Sorry, no boards found.
                </p>
                <button
                  className='DashboardListBoards-error-button'
                  type='button'
                  onClick={this.handleClick}
                >
                  Refresh
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );    
  }
}

const mapStateToProps = (state: AppState) => ({
  boards: state.dashboard.boards,
  errorRetrieve: state.dashboard.errorRetrieve,
  isRetrieving: state.dashboard.isRetrieving,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
  refreshBoards: () => {
    dispatch({ type: 'DASHBOARD_SET_BOARDS', data: [] });
  },
});

const connector = connect(mapStateToProps, mapDispatchToProps);

type Props = ConnectedProps<typeof connector>;

export default connector(DashboardListBoards);