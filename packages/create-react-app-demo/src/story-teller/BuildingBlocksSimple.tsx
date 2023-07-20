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

export function FeedbackForm() {
  return (
    <StackedForm cancelLabel="Cancel" submitLabel="Submit">
      <StackedFormSection title="Feedback">
        <TextAreaInput label="Feedback" id="feedback" defaultValue="This story was great!" />
      </StackedFormSection>
    </StackedForm>
  );
}
