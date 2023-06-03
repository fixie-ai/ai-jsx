import url from 'node:url';
// import {NaturalLanguageGitHubSearch} from '../src/app/ai';
import { LLMx } from '../../../../dist/lib';

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  const {q} = url.parse(request.url!, true).query;

  // const element = LLMx.createElement(NaturalLanguageGitHubSearch, {
  //   query: q,
  //   outputFormat: 'prose',
  // });

  const element = LLMx.Fragment({children: ['trivial']});

  for await (const streamPart of LLMx.createRenderContext().renderStream(element)) {
    response.write(streamPart);
  }

  return response.status(200);
}
