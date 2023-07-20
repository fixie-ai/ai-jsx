'use client';

import { ReactNode } from 'react';
import { Button, StackedForm, StackedFormSection, TextAreaInput } from './BuildingBlocks.tsx';

export function StoryChapter({ chapterTitle, children }: { chapterTitle: string; children: ReactNode }) {
  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold">{chapterTitle}</h2>
      <div className="mt-6">{children}</div>
      <Button>Flag as inappropriate</Button>
    </div>
  );
}

export function Card({ children, header, footer }: { children: ReactNode; header?: ReactNode; footer?: ReactNode }) {
  if (header || footer) {
    return (
      <div className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow">
        {header && <div className="px-4 py-5 sm:px-6">{header}</div>}

        <div className="px-4 py-5 sm:p-6">{children}</div>
        {footer && <div className="px-4 py-4 sm:px-6">{footer}</div>}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      <div className="px-4 py-5 sm:p-6">{children}</div>
    </div>
  );
}

export function FeedbackForm() {
  return (
    <StackedForm cancelLabel="Cancel" submitLabel="Submit">
      <StackedFormSection title="Feedback">
        <TextAreaInput label="Feedback" id="feedback" defaultValue="This story was great!" />
      </StackedFormSection>
    </StackedForm>
  );
}
