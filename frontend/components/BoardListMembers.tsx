import { useAppSelector } from '@/hooks';

import { BoardInviteUser, BoardMember } from './';


interface Props {
  isHidden: boolean;
}

export default function BoardListMembers({ isHidden }: Props) {
  const { board } = useAppSelector((state) => state.board);

  const hasMembers =
    Array.isArray(board?.memberships) && !!board?.memberships?.length;

  return (
    <div className={`BoardListMembers${isHidden ? ' is-hidden' : ''}`}>
      <ul className='BoardListMembers-list'>
        {hasMembers && !!board && board.memberships
          .sort((a, b) => {
            if (a.role > b.role) return 1;
            if (a.role < b.role) return -1;
            if (a.created_at > b.created_at) return 1;
            if (a.created_at < b.created_at) return -1;
            return 0;
          })
          .map(m => (
            <li
              className='BoardListMembers-list-item'
              key={m.user?.user_slug}
            >
              <BoardMember membership={m} />
            </li>
          ))
        }
      </ul>
      <BoardInviteUser />
    </div>
  );
}