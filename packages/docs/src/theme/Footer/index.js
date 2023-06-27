import React from 'react';
import Footer from '@theme-original/Footer';
// Shockingly, mixpanel doesn't provide types.
// @ts-expect-error
import mixpanel from 'mixpanel-browser';

mixpanel.init('0712ea9f2e9f9a078750c61e2c9c2fd8');
// It seems like this shouldn't be necessary, but without it, I don't see any network inspector activity.
mixpanel.track('Page View');

export default function FooterWrapper(props) {
  return (
    <>
      <Footer {...props} />
    </>
  );
}
