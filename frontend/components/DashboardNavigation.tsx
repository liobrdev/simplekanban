import { MouseEvent, useRef } from 'react';
import { useRouter } from 'next/router';
import { enableBodyScroll, disableBodyScroll } from 'body-scroll-lock';

import { useAppDispatch, useAppSelector } from '@/hooks';

import { MenuIcon } from './';


export default function DashboardNavigation() {
  const { menuOn } = useAppSelector((state) => state.dashboard);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const thisComponent = useRef<HTMLDivElement>(null);

  const handleShow = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (thisComponent.current) disableBodyScroll(thisComponent.current);
    dispatch({ type: 'DASHBOARD_MENU_SHOW' });
  };

  const handleClose = (e: MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
    e.preventDefault();
    if (thisComponent.current) enableBodyScroll(thisComponent.current);
    dispatch({ type: 'DASHBOARD_MENU_CLOSE' });
  };

  const handleAccount = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (thisComponent.current) enableBodyScroll(thisComponent.current);
    router.push('/account');
  };

  const handleLogout = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (thisComponent.current) enableBodyScroll(thisComponent.current);
    dispatch({ type: 'START_LOGOUT_USER' });
  };

  return (
    <>
      {menuOn && (
        <div
          className='DashboardNavigation-overlay'
          onClick={handleClose}
        />
      )}
      <div
        className={`DashboardNavigation${menuOn ? ' is-on' : ''}`}
        ref={thisComponent}
      > 
        <div className='MenuIcon-container'>
          <MenuIcon
            className={menuOn ? 'is-active' : ''}
            onClick={menuOn ? handleClose : handleShow}
            type='button'
          />
        </div>
        {menuOn && (
          <ul className='DashboardNavigation-buttons'>
            <li>
              <button
                className='DashboardNavigation-button'
                type='button'
                onClick={handleAccount}
              >
                My account
              </button>
            </li>
            <li>
              <button
                className='DashboardNavigation-button'
                type='button'
                onClick={handleLogout}
              >
                Log out
              </button>
            </li>
          </ul>
        )}
      </div>
    </>
  );
}