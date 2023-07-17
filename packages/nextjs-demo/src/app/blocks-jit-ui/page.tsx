import { Badge, Button, IconButton } from '@/components/BuildingBlocks';
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
      </div>
      <div className="gap-1.5 flex">
        <Badge color="red">foo</Badge>
        <Badge color="green">foo</Badge>
        <Badge color="indigo">foo</Badge>
      </div>
    </div>
  );
}
