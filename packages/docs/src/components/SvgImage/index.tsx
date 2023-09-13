import { cloneElement } from 'react';

type Props = {
  image: JSX.Element;
  title?: string;
};

const SvgImage = ({ image, title = '' }: Props) =>
  cloneElement(image, {
    ...image.props,
    title,
  });

export default SvgImage;
