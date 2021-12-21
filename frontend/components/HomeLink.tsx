import { ReactNode } from 'react';


interface Props {
  children: ReactNode;
  className?: string;
  href?: string | undefined;
}

export default function HomeLink({ children, className, href }: Props) {
  return (
    <div className={`HomeLink${className ? ' ' + className : ''}`}>
      <a href={href}>{children}</a>
    </div>
  );
}