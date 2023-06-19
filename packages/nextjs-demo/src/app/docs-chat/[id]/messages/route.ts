import { NextRequest, NextResponse } from 'next/server';
import { appendConversation } from '../page';

export async function POST(request: NextRequest) {
  const urlParts = request.nextUrl.pathname.split('/');

  const form = await request.text();
  const formParts = form.split('&').map((part) => part.split('='));
  for (const [key, value] of formParts) {
    if (key === 'message') {
      // This is the message to append.
      const conversationId = urlParts[urlParts.length - 2];
      await appendConversation(conversationId, {
        author: 'user',
        message: decodeURIComponent(value).replace(/\+/g, ' '),
      });
      break;
    }
  }

  const newUrl = request.nextUrl.clone();
  newUrl.pathname = urlParts.slice(0, urlParts.length - 1).join('/');
  return NextResponse.redirect(newUrl, { status: 303 });
}
