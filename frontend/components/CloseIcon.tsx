import { ButtonHTMLAttributes as Props } from 'react';

export default function CloseIcon(props: Props<HTMLButtonElement>) {
  const { className } = props;

  return (
    <button
      { ...props }
      className={`CloseIcon${className ? ' ' + className : ''}`}
    >
      <div className='CloseIcon-icon' />
    </button>
  );
}