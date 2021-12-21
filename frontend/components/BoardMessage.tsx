import React from 'react';

import { useAppSelector } from '@/hooks';
import { IMessage } from '@/types';


const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

interface Props {
  message: IMessage;
}

function BoardMessage({ message }: Props) {
  const { board } = useAppSelector((state) => state.board);
  const { user } = useAppSelector((state) => state.user);

  const senderIsClient = message.sender.user_slug === user?.user_slug;

  const displayName = !!board && (
    board.memberships.find(
      m => m.user.user_slug === message.sender.user_slug
    )?.display_name || message.sender.name
  );

  const time = new Date(message.created_at).toLocaleTimeString('en', {
    timeStyle: 'short',
    hour12: true,
    timeZone,
  });

  return (
    <div className={`BoardMessage${senderIsClient ? ' is-clientMsg' : ''}`}>
      {!message.hideInfo && (
        <div className='BoardMessage-info'>
          <span className='BoardMessage-info-sender'>{displayName}</span>
          &nbsp;
          <span className='BoardMessage-info-createdAt'>{time}</span>
        </div>
      )}
      <button className='BoardMessage-card' autoFocus>
        <p>{message.message}</p>
      </button>
    </div>
  );
}

export default React.memo(BoardMessage);