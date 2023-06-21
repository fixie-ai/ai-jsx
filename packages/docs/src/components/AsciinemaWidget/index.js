/**
 * AsciinemaWidget is a component that renders an asciinema player in Docusaurus docs.
 *
 * Code courtesy of:
 * https://consolelogdupa.com/embedding-asciinema-asciicast-in-your-docusaurus-2-docs
 */
import BrowserOnly from '@docusaurus/BrowserOnly';
import React, { useEffect, useRef } from 'react';
import 'asciinema-player/dist/bundle/asciinema-player.css';

const AsciinemaWidget = ({ src, ...asciinemaOptions }) => {
  return (
    <BrowserOnly fallback={<div>Loading asciinema cast...</div>}>
      {() => {
        const AsciinemaPlayer = require('asciinema-player');
        const ref = useRef(null);

        useEffect(() => {
          AsciinemaPlayer.create(src, ref.current, asciinemaOptions);
        }, [src]);

        return <div ref={ref} />;
      }}
    </BrowserOnly>
  );
};

export default AsciinemaWidget;
