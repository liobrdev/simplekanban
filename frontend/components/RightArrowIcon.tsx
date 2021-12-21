import { ButtonHTMLAttributes } from 'react';


interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: string;
  src?: string;
}

export default function RightArrowIcon(props: Props) {
  const { className, color, src } = props;

  return (
    <button
      { ...props }
      className={`RightArrowIcon${className ? ' ' + className : ''}`}
    >
      <div className='RightArrowIcon-image-container'>
        <img
          className='RightArrowIcon-image'
          src={src ? src : `/right-arrow${color ? '-' + color : ''}.png`}
          width='60%'
          alt='Right'
        />
      </div>
    </button>
  );
}