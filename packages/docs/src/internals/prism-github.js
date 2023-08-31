module.exports = {
    plain: {
      color: '#24292e',
      backgroundColor: '#f6f8fa',
    },
    styles: [
      {
        types: ['dataType'],
        style: {
          color: '#027d98',
          fontStyle: 'italic',
        },
      },
      {
        types: ['comment', 'prolog', 'doctype', 'cdata'],
        style: {
          color: '#24292e',
          fontStyle: 'italic',
        },
      },
      {
        types: ['namespace'],
        style: {
          opacity: 0.7,
        },
      },
      {
        types: ['string', 'attr-value'],
        style: {
          color: '#e3116c',
        },
      },
      {
        types: ['punctuation', 'operator'],
        style: {
          color: '#393A34',
        },
      },
      {
        types: ['entity', 'url', 'symbol', 'number', 'boolean', 'variable', 'constant', 'property', 'regex', 'inserted'],
        style: {
          color: '#36acaa',
        },
      },
      {
        types: ['atrule', 'keyword', 'attr-name', 'selector'],
        style: {
          color: '#00a4db',
        },
      },
      {
        types: ['function', 'deleted', 'tag'],
        style: {
          color: '#d73a49',
        },
      },
      {
        types: ['function-variable'],
        style: {
          color: '#6f42c1',
        },
      },
      {
        types: ['tag', 'selector', 'keyword'],
        style: {
          color: '#00009f',
        },
      },
    ],
  };