import { ButtonHTMLAttributes } from 'react';


interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: string;
  src?: string;
}

export default function LeftArrowIcon(props: Props) {
  const { className, color, src } = props;

  return (
    <button
      { ...props }
      className={`LeftArrowIcon${className ? ' ' + className : ''}`}
    >
      <div className='LeftArrowIcon-image-container'>
        <img
          className='LeftArrowIcon-image'
          src={src ? src : `/left-arrow${color ? '-' + color : ''}.png`}
          width='60%'
          alt='Left'
        />
      </div>
    </button>
  );
}