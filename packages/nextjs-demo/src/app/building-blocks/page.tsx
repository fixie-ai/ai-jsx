import InputPrompt from '@/components/InputPrompt';
import ResultContainer from '@/components/ResultContainer';
import BuildingBlocks from '@/components/BuildingBlocksGenerator';

export default function BuildingBlocksPage({ searchParams }: { searchParams: any }) {
  const defaultValue =
    'Summarize this JSON blob for me, using a Card: {"reservation":{"reservationId":"1234567890","passengerName":"John Doe","flightNumber":"ABC123","origin":"Los Angeles","destination":"New York","departureDate":"2022-01-01","departureTime":"09:00","arrivalDate":"2022-01-01","arrivalTime":"15:00"}}. Also use a Badge. And give me some other github-flavored markdown, using a table, <details>, and strikethrough.';
  const query = searchParams.q ?? defaultValue;
  return (
    <div>
      <ResultContainer title="Building Blocks" description="In this demo, the AI can use building block UI components">
        <InputPrompt label="Ask me anything..." defaultValue={query} />
      </ResultContainer>
      <BuildingBlocks topic={query} />
    </div>
  );
}
