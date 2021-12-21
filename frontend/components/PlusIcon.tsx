import { ButtonHTMLAttributes as Props } from 'react';

export default function PlusIcon(props: Props<HTMLButtonElement>) {
  const { className } = props;

  return (
    <button
      { ...props }
      className={`PlusIcon${className ? ' ' + className : ''}`}
    >
      <div className='PlusIcon-circle'>+</div>
    </button>
  );
}