import { ButtonHTMLAttributes as Props } from 'react';


export default function MenuIcon(props: Props<HTMLButtonElement>) {
  const { className } = props;

  return (
    <button
      { ...props }
      className={`MenuIcon${className ? ' ' + className : ''}`}
    >
      <div className='MenuIcon-icon'>
        <span className='MenuIcon-icon-line MenuIcon-icon-line--line1' />
        <span className='MenuIcon-icon-line MenuIcon-icon-line--line2' />
        <span className='MenuIcon-icon-line MenuIcon-icon-line--line3' />
      </div>
    </button>
  );
}