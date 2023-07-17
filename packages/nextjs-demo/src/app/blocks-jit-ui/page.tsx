import ActionPanel, {
  Badge,
  Button,
  ButtonGroup,
  Card,
  IconButton,
  CardList,
  StackedForm,
  InputWithLabel,
  TextAreaInput,
  SimpleRadioGroup,
  Toggle,
  CheckboxList,
  StackedFormSection,
} from '@/components/BuildingBlocks';
import { CheckCircleIcon, PlusIcon } from '@heroicons/react/20/solid';

export default function RecipeExample() {
  return (
    <div className="gap-1.5 flex flex-col">
      <div className="gap-1.5 flex">
        <Button>
          <CheckCircleIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" /> foo
        </Button>
        <Button primary>a b c foo</Button>
        <Button>✅ foo</Button>
        <IconButton>
          <PlusIcon className="h-5 w-5" aria-hidden="true" />
        </IconButton>
        <ButtonGroup labels={['first', 'middle 1', 'middle 2', 'last']} />
      </div>
      <div className="gap-1.5 flex">
        <Badge color="red">foo</Badge>
        <Badge color="green">foo</Badge>
        <Badge color="indigo">foo</Badge>
      </div>
      <div className="gap-1.5 flex">
        <Card>my card content</Card>
        <Card header={<h1>my header</h1>}>my card content</Card>
        <Card footer={<p>my footer</p>}>my card content</Card>
        <Card header={<h1>my header</h1>} footer={<p>my footer</p>}>
          my card content
        </Card>
      </div>
      <div className="gap-1.5 flex">
        <CardList>
          <p>item 1</p>
          <p>item 2</p>
          <p>item 3</p>
        </CardList>
      </div>
      <div className="gap-1.5 flex flex-col">
        <Card>
          <StackedForm cancelLabel="Cancel" submitLabel="Submit">
            <StackedFormSection title="Text Inputs">
              <InputWithLabel label="Label" type="text" id="id" placeholder="placeholder" />
              <InputWithLabel
                label="Email"
                type="email"
                id="email"
                placeholder="foo@gmail.com"
                helpText="We'll only use this for spam"
              />
              <TextAreaInput label="Comment" id="comment" defaultValue="This is a comment" />
            </StackedFormSection>
            <StackedFormSection title="Fixed Choices" subtitle="This is the section subtitle">
              <SimpleRadioGroup
                choices={[
                  { id: 'email', title: 'Email' },
                  { id: 'sms', title: 'Phone (SMS)' },
                  { id: 'push', title: 'Push notification' },
                ]}
              />
              <Toggle title="Annual billing" subtitle="(Save 10%)" />
              <Toggle title="Turbo speed" />
              <CheckboxList
                items={[
                  {
                    id: 'comments',
                    title: 'Comments',
                    description: 'Get notified when someones posts a comment on a posting.',
                  },
                  {
                    id: 'candidates',
                    title: 'Candidates',
                    description: 'Get notified when a candidate applies for a job.',
                  },
                  {
                    id: 'offers',
                    title: 'Offers',
                    description: 'Get notified when a candidate accepts or rejects an offer.',
                  },
                ]}
              />
            </StackedFormSection>
          </StackedForm>
        </Card>
        <ActionPanel
          title="Manage Subscription"
          description="Lorem ipsum dolor sit amet consectetur adipisicing elit. Recusandae voluptatibus corrupti atque repudiandae
          nam."
          buttonLabel="Change plan"
        />
      </div>
    </div>
  );
}
