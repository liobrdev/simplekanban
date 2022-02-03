import { useEffect } from 'react';
import useSWR from 'swr';

import { useAppDispatch } from '@/hooks';

import { checkBoardDetail } from '@/types';
import { request } from '@/utils';


interface Props {
  slug: string;
}

const fetcher = (url: string) => {
  const token = localStorage.getItem('simplekanban_token');

  return request
    .get(url)
    .set({ 'Authorization': `Token ${token}` })
    .then(res => {
      const board = checkBoardDetail(res.body, res);
      return board;
    });
};

export default function BoardRetrieveBoard({ slug }: Props) {
  const { data, error, isValidating } = useSWR(`/boards/${slug}/`, fetcher);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (isValidating) {
      dispatch({ type: 'START_HTTP_READ_BOARD' });
    } else {
      dispatch({ type: 'STOP_HTTP_READ_BOARD' });
    }

    if (!error && data) {
      dispatch({ type: 'SUCCESS_HTTP_READ_BOARD', board: data });
    }
  }, [data, error, isValidating, dispatch]);

  return <></>;
}