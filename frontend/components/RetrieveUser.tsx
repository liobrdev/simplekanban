import { useEffect } from 'react';
import useSWR from 'swr';

import { useAppDispatch } from '@/hooks';
import { checkUser } from '@/types';
import { request } from '@/utils';


const fetcher = (url: string) => {
  const token = localStorage.getItem('simple_kanban_token');

  return request
    .get(url)
    .set({ 'Authorization': `Token ${token}` })
    .then(res => {
      const user = checkUser(res.body, res);
      const clientIp = res.header['x-client-ip'];
      return { user, clientIp };
    });
};

export default function RetrieveUser() {
  const { data, error } = useSWR('/users/', fetcher);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (error) {
      dispatch({ type: 'SET_USER' });
    } else if (data) {
      dispatch({ type: 'SET_USER', data });
    }
  }, [data, error, dispatch]);

  return <></>;
}