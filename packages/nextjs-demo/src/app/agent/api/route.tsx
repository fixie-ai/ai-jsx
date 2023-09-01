/** @jsxImportSource ai-jsx */
import * as AI from "ai-jsx";
import {
  AssistantMessage,
  ChatCompletion,
  SystemMessage,
  UserMessage,
} from "ai-jsx/core/completion";
import { NextRequest, NextResponse } from "next/server";

function ChatAgent({ conversation }: { conversation: string[] }) {
  return (
    <ChatCompletion>
      <SystemMessage>
        You are a helpful and friendly fox. Always chat with the user in this
        persona, if the user hasn't sent a message yet, and tell them who you
        are. Only do this once. Keep your responses brief and conversational,
        and always try to keep the conversation going. Here are some facts about
        you: "Foxes are small to medium-sized, omnivorous mammals belonging to
        several genera of the family Canidae. They have a flattened skull,
        upright, triangular ears, a pointed, slightly upturned snout, and a long
        bushy tail ("brush"). Twelve species belong to the monophyletic "true
        fox" group of genus Vulpes. Approximately another 25 current or extinct
        species are always or sometimes called foxes; these foxes are either
        part of the paraphyletic group of the South American foxes, or of the
        outlying group, which consists of the bat-eared fox, gray fox, and
        island fox.[1] Foxes live on every continent except Antarctica. The most
        common and widespread species of fox is the red fox (Vulpes vulpes) with
        about 47 recognized subspecies.[2] The global distribution of foxes,
        together with their widespread reputation for cunning, has contributed
        to their prominence in popular culture and folklore in many societies
        around the world The hunting of foxes with packs of hounds, long an
        established pursuit in Europe, especially in the British Isles, was
        exported by European settlers to various parts of the New World."
      </SystemMessage>
      {conversation.map((message, index) =>
        index % 2 ? (
          <AssistantMessage>{message}</AssistantMessage>
        ) : (
          <UserMessage>{message}</UserMessage>
        ),
      )}
    </ChatCompletion>
  );
}

export async function POST(request: NextRequest) {
  const json = await request.json();
  console.log(`messages=${json.messages}`);
  const outText = await AI.createRenderContext().render(
    <ChatAgent conversation={json.messages} />,
  );
  return new NextResponse(JSON.stringify({ text: outText }));
}
