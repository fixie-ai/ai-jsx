const color = {
    draculaBackground: '#262833',
    draculaForeground: '#f8f8f2',
    draculaSelection: '#44475a',
    draculaComment: '#6272a4',
    draculaRed: '#ff5555',
    draculaOrange: '#ffb86c',
    draculaYellow: '#f1fa8c',
    draculaGreen: '#50fa7b',
    draculaPurple: '#bd93f9',
    draculaCyan: '#8be9fd',
    draculaPink: '#ff79c6',
  };
  
  const theme = {
    plain: {
      color: color.draculaForeground,
      backgroundColor: color.draculaBackground,
    },
    styles: [
      {
        types: ['prolog', 'constant', 'boolean', 'builtin'],
        style: {
          color: color.draculaPurple,
        },
      },
      {
        types: ['inserted', 'function'],
        style: {
          color: color.draculaCyan,
        },
      },
      {
        types: ['dataType'],
        style: {
          color: color.draculaCyan,
          fontStyle: 'italic',
        },
      },
      {
        types: ['deleted'],
        style: {
          color: color.draculaRed,
        },
      },
      {
        types: ['changed'],
        style: {
          color: color.draculaOrange,
        },
      },
      {
        types: ['punctuation', 'symbol'],
        style: {
          color: color.draculaForeground,
        },
      },
      {
        types: ['string', 'char', 'tag', 'selector'],
        style: {
          color: color.draculaYellow,
        },
      },
      {
        types: ['keyword', 'variable', 'operator'],
        style: {
          color: color.draculaPink,
        },
      },
      {
        types: ['number'],
        style: {
          color: color.draculaGreen,
        },
      },
      {
        types: ['comment'],
        style: {
          color: color.draculaComment,
        },
      },
      {
        types: ['attr-name'],
        style: {
          color: 'rgb(241, 250, 140)',
        },
      },
    ],
  };
  
  module.exports = theme;