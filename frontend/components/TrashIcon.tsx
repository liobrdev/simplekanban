import { ButtonHTMLAttributes } from 'react';


interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: string;
  src?: string;
}

export default function TrashIcon(props: Props) {
  const { className, color, src } = props;

  return (
    <button
      { ...props }
      className={`TrashIcon${className ? ' ' + className : ''}`}
    >
      <div className='TrashIcon-image-container'>
        <img
          className='TrashIcon-image'
          src={src ? src : `/delete_2${color ? '-' + color : ''}.png`}
          width='61.8%'
          alt='Delete'
        />
      </div>
    </button>
  );
}