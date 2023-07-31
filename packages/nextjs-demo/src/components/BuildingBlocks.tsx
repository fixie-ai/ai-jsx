'use client';

import React, { ReactNode, Children, useState } from 'react';
import classNames from 'classnames';
import _ from 'lodash';
// @ts-expect-error
import { Switch } from '@headlessui/react';

export function Button({ children, primary }: { children: ReactNode; primary?: boolean }) {
  return (
    <button
      type="button"
      className={classNames(
        'inline-flex items-center gap-x-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold shadow-sm',
        primary
          ? 'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
          : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="rounded-full bg-indigo-600 p-1.5 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      {children}
    </button>
  );
}

type BackgroundColor = 'gray' | 'red' | 'yellow' | 'green' | 'blue' | 'indigo' | 'purple' | 'pink';
export function Badge({ children, color }: { children: ReactNode; color: BackgroundColor }) {
  function getColorClasses() {
    switch (color) {
      case 'red':
        return 'bg-red-100 text-red-800 ring-red-600/20';
      case 'green':
        return 'bg-green-100 text-green-800 ring-green-600/20';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 ring-yellow-600/20';
      case 'blue':
        return 'bg-blue-100 text-blue-800 ring-blue-600/20';
      case 'indigo':
        return 'bg-indigo-100 text-indigo-800 ring-indigo-600/20';
      case 'purple':
        return 'bg-purple-100 text-purple-800 ring-purple-600/20';
      case 'pink':
        return 'bg-pink-100 text-pink-800 ring-pink-600/20';
      case 'gray':
      default:
        return 'bg-gray-100 text-gray-800 ring-gray-600/20';
      // This makes it too sensitive to model failures. It's better
      // to gracefully degrade.
      //   throw new Error(`Unrecognized color: ${color}`);
    }
  }
  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
        getColorClasses()
      )}
    >
      {children}
    </span>
  );
}

export function ButtonGroup({ labels }: { labels: string[] }) {
  return (
    <span className="isolate inline-flex rounded-md shadow-sm">
      <button
        type="button"
        className="relative inline-flex items-center rounded-l-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
      >
        {labels[0]}
      </button>
      {labels.length > 2 &&
        labels.slice(1, -1).map((label, index) => (
          <button
            key={index}
            type="button"
            className="relative -ml-px inline-flex items-center bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
          >
            {label}
          </button>
        ))}

      <button
        type="button"
        className="relative -ml-px inline-flex items-center rounded-r-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-10"
      >
        {_.last(labels)}
      </button>
    </span>
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

export function CardList({ children }: { children: ReactNode[] }) {
  return (
    <ul role="list" className="space-y-3">
      {Children.map(children, (child, index) => (
        <li key={index} className="overflow-hidden rounded-md bg-white px-6 py-4 shadow">
          {child}
        </li>
      ))}
    </ul>
  );
}

/**
 * Example:
 *
    <InputWithLabel
      label="Quests Completed"
      type="number"
      id="character-quests-completed"
      exampleValue="0"
    />

  Example 2:

    <InputWithLabel
      label="Gold"
      type="number"
      id="character-gold"
      exampleValue="0"
      helpText="The amount of gold the character has"
    />
 */
export function InputWithLabel({
  label,
  type,
  id,
  exampleValue,
  helpText,
}: {
  label: string;
  type: string;
  id: string;
  /* An example value. This is NOT the place for help text. */
  exampleValue: string;

  /* Text guiding the user on how to fill out the input. */
  helpText?: string;
}) {
  return (
    <div>
      <div className="rounded-md px-3 pb-1.5 pt-2.5 shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-indigo-600">
        <label htmlFor={id} className="block text-xs font-medium text-gray-900">
          {label}
        </label>
        <input
          type={type}
          name={id}
          id={id}
          className="block w-full border-0 p-0 text-gray-900 exampleValue:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
          placeholder={exampleValue}
        />
      </div>
      {helpText && (
        <p className="mt-2 text-sm text-gray-500" id="email-description">
          {helpText}
        </p>
      )}
    </div>
  );
}

export function TextAreaInput({ label, id, defaultValue }: { label: string; id: string; defaultValue: string }) {
  return (
    <div>
      <label htmlFor="comment" className="block text-sm font-medium leading-6 text-gray-900">
        {label}
      </label>
      <div className="mt-2">
        <textarea
          rows={4}
          name={id}
          id={id}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 exampleValue:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          defaultValue={defaultValue}
        />
      </div>
    </div>
  );
}

export function SimpleRadioGroup({ choices }: { choices: { id: string; title: string }[] }) {
  return (
    <div>
      <label className="text-base font-semibold text-gray-900">Notifications</label>
      <p className="text-sm text-gray-500">How do you prefer to receive notifications?</p>
      <fieldset className="mt-4">
        <legend className="sr-only">Notification method</legend>
        <div className="space-y-4 sm:flex sm:items-center sm:space-x-10 sm:space-y-0">
          {choices.map((choice) => (
            <div key={choice.id} className="flex items-center">
              <input
                id={choice.id}
                name="notification-method"
                type="radio"
                defaultChecked={choice.id === 'email'}
                className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-600"
              />
              <label htmlFor={choice.id} className="ml-3 block text-sm font-medium leading-6 text-gray-900">
                {choice.title}
              </label>
            </div>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export function Toggle({ title, subtitle }: { title: string; subtitle?: string }) {
  const [enabled, setEnabled] = useState(false);

  return (
    <Switch.Group as="div" className="flex items-center">
      <Switch
        checked={enabled}
        onChange={setEnabled}
        className={classNames(
          enabled ? 'bg-indigo-600' : 'bg-gray-200',
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2'
        )}
      >
        <span
          aria-hidden="true"
          className={classNames(
            enabled ? 'translate-x-5' : 'translate-x-0',
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
          )}
        />
      </Switch>
      <Switch.Label as="span" className="ml-3 text-sm">
        <span className="font-medium text-gray-900">{title}</span>{' '}
        {subtitle && <span className="text-gray-500">{subtitle}</span>}
      </Switch.Label>
    </Switch.Group>
  );
}

export function CheckboxList({ items }: { items: { id: string; title: string; description: string }[] }) {
  return (
    <fieldset>
      <div className="space-y-5">
        {items.map((item, index) => (
          <div className="relative flex items-start" key={index}>
            <div className="flex h-6 items-center">
              <input
                id={item.id}
                aria-describedby={`${item.id}-description`}
                name={item.id}
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
              />
            </div>
            <div className="ml-3 text-sm leading-6">
              <label htmlFor={item.id} className="font-medium text-gray-900">
                {item.title}
              </label>
              <p id="comments-description" className="text-gray-500">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

export function ActionPanel({
  title,
  description,
  buttonLabel,
}: {
  title: ReactNode;
  description: ReactNode;
  buttonLabel: ReactNode;
}) {
  return (
    <Card>
      <h3 className="text-base font-semibold leading-6 text-gray-900">{title}</h3>
      <div className="mt-2 max-w-xl text-sm text-gray-500">
        <p>{description}</p>
      </div>
      <div className="mt-5">
        <button
          type="button"
          className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          {buttonLabel}
        </button>
      </div>
    </Card>
  );
}

export function StackedFormSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-gray-900/10 pb-6">
      <h2 className="text-base font-semibold leading-7 text-gray-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm leading-6 text-gray-600">{subtitle}</p>}
      <div className="mt-4 flex flex-col gap-y-3">{children}</div>
    </div>
  );
}

export function StackedForm({
  children,
  cancelLabel,
  submitLabel,
}: {
  children: ReactNode;
  cancelLabel: ReactNode;
  submitLabel: ReactNode;
}) {
  return (
    <form>
      <div className="space-y-6">{children}</div>
      <div className="mt-6 flex items-center justify-end gap-x-6">
        <button type="button" className="text-sm font-semibold leading-6 text-gray-900">
          {cancelLabel}
        </button>
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

// TODO: What's the best way to give the UI icons? Maybe stick to emojis for now?
