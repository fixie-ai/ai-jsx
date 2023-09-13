import clsx from 'clsx';
import React from 'react';

type Props = {
  className?: string;
  onClick?: () => void;
  side: 'top' | 'right' | 'bottom' | 'left';
};

const chevronTitle = {
  bottom: 'Arrow down icon',
  left: 'Arrow left icon',
  right: 'Arrow right icon',
  top: 'Arrow up icon',
};

const Chevron = ({ className, onClick, side }: Props) => {
  let angle = 0;

  if (side === 'right') {
    angle = 90;
  }

  if (side === 'bottom') {
    angle = 180;
  }

  if (side === 'left') {
    angle = 270;
  }

  return (
    <svg
      className={clsx(className)}
      fill="currentColor"
      focusable="false"
      onClick={onClick}
      role="img"
      viewBox="5.40 7.12 9.23 5.25"
      width="26"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: `rotate(${angle}deg)` }}
    >
      <title>{chevronTitle[side]}</title>
      <path d="M6.582 12.141a.695.695 0 01-.978 0 .68.68 0 010-.969l3.908-3.83a.697.697 0 01.979 0l3.908 3.83a.68.68 0 010 .969.697.697 0 01-.979 0L10 9l-3.418 3.141z" />
    </svg>
  );
};

Chevron.defaultProps = {
  side: 'top',
};

export default Chevron;
