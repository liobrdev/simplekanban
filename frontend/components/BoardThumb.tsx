import React, { Component } from 'react';

import Link from 'next/link';
import { debounce } from 'lodash';

import { IBoardThumb as Props } from '@/types';


interface State {
  didFocus: boolean;
  isOverflowing: boolean;
  animationDuration: '0s' | '10s' | '15s' | '20s';
}

export default class BoardThumb extends Component<Props, State> {
  private focusTimeout?: ReturnType<typeof setTimeout>;

  constructor(props: Props) {
    super(props);

    this.state = {
      didFocus: false,
      isOverflowing: false,
      animationDuration: '0s',
    };

    this.focusTimeout = undefined;
    this.handleFocus = debounce(this.handleFocus.bind(this), 1000, {
      leading: true,
      trailing: false,
    });
  };

  handleFocus() {
    this.focusTimeout =
      setTimeout(() => this.setState({ didFocus: true }), 250);
  };

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.state.didFocus && !prevState.didFocus) {
      const parent =
        document.getElementById(`boardThumbBoxText_${this.props.board_slug}`);
      const child = parent?.firstElementChild as HTMLElement;

      if (parent && child) {
        const diff = child.offsetWidth - parent.offsetWidth;

        if (diff <= 0) {
          this.setState({ isOverflowing: false });
        } else if (diff <= 200) {
          this.setState({ animationDuration: '10s', isOverflowing: true });
        } else if (diff <= 400) {
          this.setState({ animationDuration: '15s', isOverflowing: true });
        } else {
          this.setState({ animationDuration: '20s', isOverflowing: true });
        }
      }

      this.setState({ didFocus: false });
    }
  }

  componentWillUnmount() {
    if (this.focusTimeout) clearTimeout(this.focusTimeout);
    (this.handleFocus as ReturnType<typeof debounce>).cancel();
  }

  render() {
    const { isOverflowing, animationDuration } = this.state;
    const { board_slug, board_title } = this.props;

    return (
      <Link href={`/board/${board_slug}`}>
        <a
          className={`BoardThumb${isOverflowing ? ' is-overflowing' : ''}`}
          onFocus={this.handleFocus}
          onMouseEnter={this.handleFocus}
        >
          <div className='BoardThumb-box'>
            <div
              className='BoardThumb-box-text'
              id={`boardThumbBoxText_${board_slug}`}
              >
              <span
                className='BoardThumb-box-text-outer'
                style={isOverflowing ? { animationDuration } : undefined}
              >
                <span
                  className='BoardThumb-box-text-outer-inner'
                  style={isOverflowing ? { animationDuration } : undefined}
                >
                  {board_title}&nbsp;&nbsp;&nbsp;&nbsp;
                </span>
              </span>
            </div>
          </div>
        </a>
      </Link>
    );
  }
}