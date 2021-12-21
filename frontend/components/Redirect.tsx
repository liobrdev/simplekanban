import { useEffect } from 'react';
import { useRouter } from 'next/router';


interface Props {
  pathname: string;
  replace?: boolean;
}

export default function Redirect({ pathname, replace }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (replace) router.replace(pathname);
      else router.push(pathname);
  });

  return <></>;
}