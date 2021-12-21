import { ButtonHTMLAttributes } from 'react';


interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: string;
  src?: string;
}

export default function SendIcon(props: Props) {
  const { className, color, src } = props;

  return (
    <button
      { ...props }
      className={`SendIcon${className ? ' ' + className : ''}`}
    >
      <div className='SendIcon-image-container'>
        <img
          className='SendIcon-image'
          src={src ? src : `/send${color ? '-' + color : ''}.png`}
          width='60%'
          alt='Send'
        />
      </div>
    </button>
  );
}