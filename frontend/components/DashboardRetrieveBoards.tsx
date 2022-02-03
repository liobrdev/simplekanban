import { useEffect } from 'react';
import useSWR from 'swr';

import { useAppDispatch } from '@/hooks';

import { checkListBoard, IListBoard } from '@/types';
import { request } from '@/utils';


const fetcher = (url: string) => {
  const token = localStorage.getItem('simplekanban_token');

  return request
    .get(url)
    .set({ 'Authorization': `Token ${token}` })
    .then(res => {
      const boards: IListBoard[] = [];
      for (const board of res.body) boards.push(checkListBoard(board, res));
      return boards;
    });
}

export default function DashboardRetrieveBoards() {
  const { data, error, isValidating } = useSWR('/boards/', fetcher);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (isValidating) {
      dispatch({ type: 'START_RETRIEVE_BOARDS' });
    } else {
      dispatch({ type: 'STOP_RETRIEVE_BOARDS' });
    }

    if (error) {
      dispatch({ type: 'DASHBOARD_SET_BOARDS', data: [], error });
    } else if (data) {
      dispatch({ type: 'DASHBOARD_SET_BOARDS', data });
    }
  }, [data, error, isValidating, dispatch]);

  return <></>;
}