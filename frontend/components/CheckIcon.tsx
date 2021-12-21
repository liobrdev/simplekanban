import { ButtonHTMLAttributes } from 'react';


interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: string;
  src?: string;
}

export default function CheckIcon(props: Props) {
  const { className, color, src } = props;

  return (
    <button
      { ...props }
      className={`CheckIcon${className ? ' ' + className : ''}`}
    >
      <div className='CheckIcon-image-container'>
        <img
          className='CheckIcon-image'
          src={src ? src : `/checkmark${color ? '-' + color : ''}.png`}
          width='55%'
          alt='Save'
        />
      </div>
    </button>
  );
}